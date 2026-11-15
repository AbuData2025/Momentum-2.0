import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.abule.momentum", // permanent once published, so choose it carefully
  appName: "Momentum",
  webDir: "dist",
  backgroundColor: "#0d0f17",
  plugins: {
    // Sign in natively, then hand the token to the Firebase web SDK (the app keeps using the web SDK).
    FirebaseAuthentication: { skipNativeAuth: true, providers: ["google.com"] },
  },
};
export default config;
