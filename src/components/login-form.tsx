"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { GalleryVerticalEndIcon } from "lucide-react"
import { motion, type Variants } from "framer-motion"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { loginAction } from "@/app/_actions/auth"
import { useSessionStore } from "@/lib/stores/session-store"

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const setUser = useSessionStore((s) => s.setUser)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error("Please enter your email")
      return
    }
    if (!password) {
      toast.error("Password is required")
      return
    }
    setLoading(true)
    const toastId = toast.loading("Signing in…")
    try {
      const result = await loginAction({ email, password })
      if (result?.serverError || result?.validationErrors || !result?.data) {
        throw new Error(result?.serverError || "Invalid email or password")
      }
      setUser(result.data)
      toast.success("Welcome back!", { id: toastId })
      router.push("/dashboard")
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password", { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <motion.form
        variants={container}
        initial="hidden"
        animate="show"
        onSubmit={handleLogin}
      >
        <FieldGroup>
          <motion.div variants={item} className="flex flex-col items-center gap-2 text-center">
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEndIcon className="size-6" />
              </div>
              <span className="sr-only">CMS</span>
            </a>
            <h1 className="text-xl font-bold">Welcome to CMS</h1>
            <FieldDescription>
              Don&apos;t have an account? <a href="#">Sign up</a>
            </FieldDescription>
          </motion.div>

          <motion.div variants={item}>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </motion.div>

          <motion.div variants={item} className="flex flex-col gap-2">
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          </motion.div>

          <motion.div variants={item}>
            <Field>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in…" : "Login"}
              </Button>
            </Field>
          </motion.div>

        </FieldGroup>
      </motion.form>

    </div>
  )
}
