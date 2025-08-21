export interface CheessoUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type AuthProvider = 'firebase' | 'cognito';

export type SocialProvider = 'google' | 'apple' | 'microsoft' | 'facebook' | 'github';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface CognitoConfig {
  userPoolId: string;
  userPoolWebClientId: string;
  region: string;
  identityPoolId?: string; // For AWS credentials
  domain?: string; // For hosted UI
}

export interface CheessoConfig {
  provider: AuthProvider;
  firebaseConfig?: FirebaseConfig;
  cognitoConfig?: CognitoConfig;
  socialProviders?: SocialProvider[];
  crossDomainCookie?: string; // Domain for SSO cookies (e.g., '.example.com')
}

export interface CheessoAuthState {
  isAuthenticated: boolean;
  user: CheessoUser | null;
  loading: boolean;
}

