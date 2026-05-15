import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        // Simulación de usuario para desarrollo
        // En la Fase 9 se conectará con el backend FastAPI real
        if (credentials.email === "admin@example.com" && credentials.password === "admin") {
          return {
            id: "1",
            name: "Administrador",
            email: "admin@example.com",
          };
        }
        
        // Por ahora aceptamos cualquier login para facilitar la migración
        return {
          id: "local-user",
          name: "Usuario de Prueba",
          email: credentials.email as string,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});
