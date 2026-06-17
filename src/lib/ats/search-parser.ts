export interface SearchCandidate {
  applicantName: string
  applicantEmail: string
  coverLetter: string | null
  resumeText?: string | null
  extractedSkills: string[]
  extractedExperience: number | null
  extractedLocation: string | null
  extractedEducation: string | null
}

type TokenType = "AND" | "OR" | "NOT" | "LPAREN" | "RPAREN" | "FILTER" | "TERM" | "EOF"

interface Token {
  type: TokenType
  value: string
  filterKey?: string
  filterOp?: string
  filterVal?: string
}

class Tokenizer {
  private input: string
  private pos = 0

  constructor(input: string) {
    this.input = input
  }

  public tokenize(): Token[] {
    const tokens: Token[] = []
    while (this.pos < this.input.length) {
      const char = this.input[this.pos]

      if (/\s/.test(char)) {
        this.pos++
        continue
      }

      if (char === "(") {
        tokens.push({ type: "LPAREN", value: "(" })
        this.pos++
        continue
      }

      if (char === ")") {
        tokens.push({ type: "RPAREN", value: ")" })
        this.pos++
        continue
      }

      // Check operators
      if (this.matchWord("AND")) {
        tokens.push({ type: "AND", value: "AND" })
        continue
      }
      if (this.matchWord("OR")) {
        tokens.push({ type: "OR", value: "OR" })
        continue
      }
      if (this.matchWord("NOT")) {
        tokens.push({ type: "NOT", value: "NOT" })
        continue
      }

      // Read filter or term
      const start = this.pos
      // Read until space, parenthesis, or operator boundary
      while (
        this.pos < this.input.length &&
        !/\s/.test(this.input[this.pos]) &&
        this.input[this.pos] !== "(" &&
        this.input[this.pos] !== ")"
      ) {
        this.pos++
      }
      const rawTerm = this.input.substring(start, this.pos)
      if (rawTerm.length === 0) {
        this.pos++
        continue
      }

      // Parse filter expressions like skill:react, experience:5+, experience>4, experience>=5
      const filterRegex = /^(skill|experience|location|education)(:|>|<|>=|<=)(.+)$/i
      const match = rawTerm.match(filterRegex)
      if (match) {
        tokens.push({
          type: "FILTER",
          value: rawTerm,
          filterKey: match[1].toLowerCase(),
          filterOp: match[2],
          filterVal: match[3],
        })
      } else {
        tokens.push({ type: "TERM", value: rawTerm })
      }
    }
    tokens.push({ type: "EOF", value: "" })
    return tokens
  }

  private matchWord(word: string): boolean {
    const len = word.length
    if (this.pos + len <= this.input.length) {
      const sub = this.input.substring(this.pos, this.pos + len)
      if (sub.toUpperCase() === word) {
        // Ensure word boundary (space or paren or EOF)
        const nextChar = this.input[this.pos + len]
        if (!nextChar || /\s/.test(nextChar) || nextChar === "(" || nextChar === ")") {
          this.pos += len
          return true
        }
      }
    }
    return false
  }
}

// AST Nodes
interface ASTNode {
  evaluate(candidate: SearchCandidate): boolean
}

class OrNode implements ASTNode {
  constructor(private left: ASTNode, private right: ASTNode) {}
  evaluate(candidate: SearchCandidate): boolean {
    return this.left.evaluate(candidate) || this.right.evaluate(candidate)
  }
}

class AndNode implements ASTNode {
  constructor(private left: ASTNode, private right: ASTNode) {}
  evaluate(candidate: SearchCandidate): boolean {
    return this.left.evaluate(candidate) && this.right.evaluate(candidate)
  }
}

class NotNode implements ASTNode {
  constructor(private operand: ASTNode) {}
  evaluate(candidate: SearchCandidate): boolean {
    return !this.operand.evaluate(candidate)
  }
}

class FilterNode implements ASTNode {
  constructor(
    private key: string,
    private op: string,
    private val: string
  ) {}

  evaluate(candidate: SearchCandidate): boolean {
    const targetVal = this.val.toLowerCase()

    switch (this.key) {
      case "skill":
        return candidate.extractedSkills.some(s => s.toLowerCase() === targetVal)

      case "location":
        return !!candidate.extractedLocation?.toLowerCase().includes(targetVal)

      case "education":
        return !!candidate.extractedEducation?.toLowerCase().includes(targetVal)

      case "experience": {
        const candidateExp = candidate.extractedExperience ?? 0
        
        // Handle values like 5+
        const cleanVal = targetVal.endsWith("+") ? targetVal.slice(0, -1) : targetVal
        const parsedVal = parseInt(cleanVal, 10) || 0

        if (this.op === ">") return candidateExp > parsedVal
        if (this.op === ">=") return candidateExp >= parsedVal
        if (this.op === "<") return candidateExp < parsedVal
        if (this.op === "<=") return candidateExp <= parsedVal

        // Default: matches 5+ (meaning >= 5) or exact match
        if (targetVal.endsWith("+")) {
          return candidateExp >= parsedVal
        }
        return candidateExp === parsedVal
      }

      default:
        return false
    }
  }
}

class TermNode implements ASTNode {
  constructor(private value: string) {}

  evaluate(candidate: SearchCandidate): boolean {
    const searchVal = this.value.toLowerCase()
    // General keyword match: check name, email, cover letter, skills, education, location
    if (candidate.applicantName.toLowerCase().includes(searchVal)) return true
    if (candidate.applicantEmail.toLowerCase().includes(searchVal)) return true
    if (candidate.coverLetter?.toLowerCase().includes(searchVal)) return true
    if (candidate.resumeText?.toLowerCase().includes(searchVal)) return true
    if (candidate.extractedSkills.some(s => s.toLowerCase().includes(searchVal))) return true
    if (candidate.extractedLocation?.toLowerCase().includes(searchVal)) return true
    if (candidate.extractedEducation?.toLowerCase().includes(searchVal)) return true

    return false
  }
}

class SearchParser {
  private tokens: Token[]
  private current = 0

  constructor(tokens: Token[]) {
    this.tokens = tokens
  }

  public parse(): ASTNode {
    return this.parseExpression()
  }

  private parseExpression(): ASTNode {
    let node = this.parseTerm()

    while (this.match("OR")) {
      const right = this.parseTerm()
      node = new OrNode(node, right)
    }

    return node
  }

  private parseTerm(): ASTNode {
    let node = this.parseFactor()

    while (this.match("AND") || this.isNextImplicitAnd()) {
      // Consume AND token if it was explicitly present
      if (this.peek().type === "AND") {
        this.advance()
      }
      const right = this.parseFactor()
      node = new AndNode(node, right)
    }

    return node
  }

  private parseFactor(): ASTNode {
    if (this.match("NOT")) {
      const operand = this.parseFactor()
      return new NotNode(operand)
    }

    if (this.match("LPAREN")) {
      const node = this.parseExpression()
      this.consume("RPAREN", "Expected ')'")
      return node
    }

    const token = this.peek()
    if (token.type === "FILTER" && token.filterKey && token.filterOp && token.filterVal) {
      this.advance()
      return new FilterNode(token.filterKey, token.filterOp, token.filterVal)
    }

    if (token.type === "TERM") {
      this.advance()
      return new TermNode(token.value)
    }

    throw new Error(`Unexpected token: ${token.value || token.type}`)
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance()
      return true
    }
    return false
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type
  }

  private isNextImplicitAnd(): boolean {
    const nextType = this.peek().type
    return nextType === "LPAREN" || nextType === "FILTER" || nextType === "TERM" || nextType === "NOT"
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance()
    throw new Error(message)
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private advance(): Token {
    if (this.current < this.tokens.length - 1) this.current++
    return this.tokens[this.current - 1]
  }
}

/**
 * Matches a query string against a SearchCandidate record using advanced boolean logic.
 */
export function evaluateSearchQuery(query: string, candidate: SearchCandidate): boolean {
  const cleanQuery = query.trim()
  if (!cleanQuery) return true

  try {
    const tokenizer = new Tokenizer(cleanQuery)
    const tokens = tokenizer.tokenize()
    const parser = new SearchParser(tokens)
    const ast = parser.parse()
    return ast.evaluate(candidate)
  } catch (err) {
    console.error("Advanced search query parsing failed, falling back to simple match:", err)
    // Fallback: simple case-insensitive text check
    const lowerQuery = cleanQuery.toLowerCase()
    return (
      candidate.applicantName.toLowerCase().includes(lowerQuery) ||
      candidate.applicantEmail.toLowerCase().includes(lowerQuery) ||
      !!candidate.coverLetter?.toLowerCase().includes(lowerQuery) ||
      candidate.extractedSkills.some(s => s.toLowerCase().includes(lowerQuery)) ||
      !!candidate.extractedLocation?.toLowerCase().includes(lowerQuery) ||
      !!candidate.extractedEducation?.toLowerCase().includes(lowerQuery)
    )
  }
}
