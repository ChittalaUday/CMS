'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface GrammarIssue {
  start: number;
  end: number;
  message: string;
  suggestion: string;
}

interface RuleIssue {
  text: string;
  message: string;
}

interface ReadabilityStats {
  score: number;
  avgSentenceLength: number;
  longSentences: number;
  passiveVoice: number;
  ruleIssues: RuleIssue[];
}

interface UseWritingAssistReturn {
  grammarIssues: GrammarIssue[];
  ghostSuggestion: string;
  ghostPartial: string;
  isGrammarChecking: boolean;
  dismissGhost: () => void;
  readabilityStats: ReadabilityStats;
}

export function useWritingAssist(plainText: string, enabled = true): UseWritingAssistReturn {
  const [grammarIssues, setGrammarIssues] = useState<GrammarIssue[]>([]);
  const [ghostSuggestion, setGhostSuggestion] = useState('');
  const [ghostPartial, setGhostPartial] = useState('');
  const [isGrammarChecking, setIsGrammarChecking] = useState(false);

  const lastCheckedTextRef = useRef('');

  const dismissGhost = useCallback(() => {
    setGhostSuggestion('');
    setGhostPartial('');
  }, []);

  // Ghost text — 750ms debounce
  useEffect(() => {
    setGhostSuggestion('');
    setGhostPartial('');
    if (!enabled || !plainText || plainText.length < 15) return;

    const timer = setTimeout(async () => {
      const sentences = plainText.split(/[.!?]+\s+/);
      const lastSentence = (sentences[sentences.length - 1] || '').trim();

      if (!lastSentence || lastSentence.length < 10) {
        setGhostSuggestion('');
        return;
      }

      // Detect if the user is mid-word (last chars are non-space)
      const partial = lastSentence.match(/\S+$/)?.[0] || '';
      const isAfterSpace = plainText.endsWith(' ');

      try {
        const res = await fetch('/api/ai/writing-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ghost',
            text: lastSentence,
            partial: isAfterSpace ? '' : partial,
          }),
        });
        if (!res.ok) return;
        const { continuation } = await res.json();
        if (continuation && continuation.trim()) {
          setGhostSuggestion(continuation.trim());
          setGhostPartial(isAfterSpace ? '' : partial);
        }
      } catch {
        // Silently fail — ghost text is non-critical
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [plainText]);

  // Grammar check — 2000ms debounce
  useEffect(() => {
    if (!enabled) { setGrammarIssues([]); return; }
    if (plainText.length < 30) return;
    if (plainText === lastCheckedTextRef.current) return;

    const timer = setTimeout(async () => {
      lastCheckedTextRef.current = plainText;
      setIsGrammarChecking(true);

      try {
        const res = await fetch('/api/ai/writing-assist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'grammar', text: plainText.slice(0, 800) }),
        });
        if (!res.ok) return;
        const { issues } = await res.json();
        setGrammarIssues(Array.isArray(issues) ? issues : []);
      } catch {
        // Silently fail
      } finally {
        setIsGrammarChecking(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [plainText]);

  // Readability stats — synchronous, computed via useMemo
  const readabilityStats = useMemo<ReadabilityStats>(() => {
    if (!plainText.trim()) {
      return { score: 100, avgSentenceLength: 0, longSentences: 0, passiveVoice: 0, ruleIssues: [] };
    }

    const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(sentences.length, 1);

    const words = plainText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    const avgSentenceLength = wordCount / sentenceCount;

    const longSentences = sentences.filter(s => {
      const wc = s.trim().split(/\s+/).filter(Boolean).length;
      return wc > 20;
    }).length;

    const passiveMatches = plainText.match(/\b(is|are|was|were|be|been|being)\s+\w+ed\b/gi) || [];
    const passiveVoice = passiveMatches.length;

    const score = Math.max(0, Math.min(100, Math.round(100 - avgSentenceLength * 1.5 - passiveVoice * 5)));

    // Repeated word detection
    const ruleIssues: RuleIssue[] = [];
    const repeatedRegex = /\b(\w+)\s+\1\b/gi;
    let match: RegExpExecArray | null;
    while ((match = repeatedRegex.exec(plainText)) !== null) {
      ruleIssues.push({ text: match[0], message: 'Repeated word' });
    }

    return { score, avgSentenceLength, longSentences, passiveVoice, ruleIssues };
  }, [plainText]);

  return { grammarIssues, ghostSuggestion, ghostPartial, isGrammarChecking, dismissGhost, readabilityStats };
}
