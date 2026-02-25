import jwt, { JwtPayload } from "jsonwebtoken";

export interface AuthClaims {
  sub: string;
  chainId: number;
  iat?: number;
  exp?: number;
}

interface AuthServiceOptions {
  jwtSecret: string;
  sessionTtlSec: number;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly sessionTtlSec: number;

  constructor(options: AuthServiceOptions) {
    this.jwtSecret = options.jwtSecret;
    this.sessionTtlSec = options.sessionTtlSec;
  }

  loginWithBchAddress(address: string): { token: string; address: string; expiresAt: number; chainId: number } {
    if (!address.startsWith("bchtest:")) {
      throw new Error("Invalid Chipnet BCH address. Must start with bchtest:");
    }

    const normalized = address.toLowerCase();

    const token = jwt.sign(
      {
        sub: normalized,
        chainId: 0,
      },
      this.jwtSecret,
      {
        expiresIn: this.sessionTtlSec,
      }
    );

    const decoded = jwt.decode(token) as JwtPayload | null;
    const expSec = decoded?.exp ?? Math.floor(Date.now() / 1000) + this.sessionTtlSec;

    return {
      token,
      address: normalized,
      chainId: 0,
      expiresAt: expSec * 1000,
    };
  }

  verifyToken(token: string): AuthClaims {
    const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;

    if (!decoded.sub || typeof decoded.sub !== "string") {
      throw new Error("Invalid auth token subject");
    }

    return {
      sub: decoded.sub,
      chainId: Number(decoded.chainId || 0),
      iat: decoded.iat,
      exp: decoded.exp,
    };
  }
}
