import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { FileStorage } from '@/lib/file-storage'

const handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development-only-change-in-production',
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await FileStorage.validateUser(
            credentials.email,
            credentials.password
          )

          if (user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name
            }
          }

          return null
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/',
    error: '/'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...(session.user || {}),
          id: token.id as string
        }
      }
      return session
    }
  }
})

export { handler as GET, handler as POST }