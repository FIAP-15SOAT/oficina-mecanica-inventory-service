import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Algorithm, JwtHeader, JwtPayload } from 'jsonwebtoken';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthenticatedPrincipal } from '@application/ports/output/authenticated-principal';
import { UserRole } from '@domain/enums/user-role.enum';
import { readPemKey } from '@infrastructure/utils/read-pem-key.util';

/** Only algorithm accepted: pinning it blocks HS256 tokens signed with the public key. */
export const STAFF_TOKEN_ALGORITHM: Algorithm = 'RS256';

const STAFF_ROLES: readonly unknown[] = Object.values(UserRole);

interface StaffJwt {
  header: JwtHeader;
  payload: JwtPayload & { typ?: unknown; email?: unknown; role?: unknown };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * getOrThrow only rejects undefined; an empty issuer or audience would make
 * jsonwebtoken skip that check, so it fails at boot instead.
 */
function readRequired(configService: ConfigService, name: string): string {
  const value = configService.getOrThrow<string>(name);

  if (!isNonEmptyString(value)) {
    throw new Error(`${name} não pode ser vazio`);
  }

  return value;
}

/**
 * Validates the staff access token locally (AD-11): passport-jwt checks the
 * RS256 signature, iss, aud and exp; validate() checks kid, typ and claims.
 * No lookup against Identity.
 */
@Injectable()
export class StaffJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly keyId: string;

  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: readPemKey(configService, 'STAFF_JWT_PUBLIC_KEY', 'PUBLIC'),
      algorithms: [STAFF_TOKEN_ALGORITHM],
      issuer: readRequired(configService, 'STAFF_JWT_ISSUER'),
      audience: readRequired(configService, 'STAFF_JWT_AUDIENCE'),
      // validate() needs the header to check the kid.
      jsonWebTokenOptions: { complete: true },
    });
    this.keyId = readRequired(configService, 'STAFF_JWT_KEY_ID');
  }

  validate({ header, payload }: StaffJwt): AuthenticatedPrincipal {
    const { sub, email, role } = payload;

    if (
      header.kid !== this.keyId ||
      payload.typ !== 'access' ||
      // jsonwebtoken only checks exp when the claim exists.
      typeof payload.exp !== 'number' ||
      !isNonEmptyString(sub) ||
      !isNonEmptyString(email) ||
      !STAFF_ROLES.includes(role)
    ) {
      throw new UnauthorizedException('Token inválido');
    }

    return { sub, email, role: role as UserRole };
  }
}
