export interface SplLoginResponse {
  name: string;
  timestamp: string;
  token: string; // this should not be used anymore
  jwt_token: string;
  jwt_expiration_dt: string;
}
