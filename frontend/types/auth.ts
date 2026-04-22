export type AuthUser = {
  email: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type StoredAuthSession = {
  user: AuthUser;
  tokens: AuthTokens;
};
