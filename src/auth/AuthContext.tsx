import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth } from "../lib/firebase";

type AuthState = { user: User | null; loading: boolean; signIn: () => Promise<unknown>; logOut: () => Promise<void> };
const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);
  const value: AuthState = {
    user, loading,
    // In the Android app the web popup can't run, so Google sign-in happens natively and the
    // resulting token is handed to the Firebase web SDK. The rest of the app is unchanged.
    signIn: async () => {
      if (Capacitor.isNativePlatform()) {
        const { credential } = await FirebaseAuthentication.signInWithGoogle();
        if (!credential?.idToken) throw new Error("Google sign-in returned no ID token.");
        return signInWithCredential(auth, GoogleAuthProvider.credential(credential.idToken));
      }
      return signInWithPopup(auth, new GoogleAuthProvider());
    },
    logOut: async () => {
      await signOut(auth);
      if (Capacitor.isNativePlatform()) await FirebaseAuthentication.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
};
