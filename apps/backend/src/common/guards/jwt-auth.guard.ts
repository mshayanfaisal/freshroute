import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Validates the access-token Bearer JWT via the 'jwt' Passport strategy. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
