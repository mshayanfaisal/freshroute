import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { AppConfig } from '../../config/configuration';
import { UserRole } from '../../common/enums';

/**
 * Socket.io gateway. Authenticates each socket with the access-token JWT
 * (passed via `auth.token` or `Authorization` header) and joins it to two rooms:
 *   - user:<id>   → targeted notifications (order confirmed, stop delivered)
 *   - role:<role> → broadcast per role (e.g. admin escalations)
 */
@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers.authorization || '').replace('Bearer ', '');
      if (!token) throw new Error('No token');

      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('jwt', { infer: true }).accessSecret,
      });
      const userId = payload.sub as string;
      const role = payload.role as UserRole;

      client.data.userId = userId;
      client.data.role = role;
      client.join(`user:${userId}`);
      client.join(`role:${role}`);
      this.logger.debug(`Socket ${client.id} connected (user:${userId}, role:${role})`);
    } catch {
      this.logger.warn(`Rejected unauthenticated socket ${client.id}`);
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket ${client.id} disconnected`);
  }

  /** Emit an event to a single user's room. */
  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }

  /** Emit an event to everyone with a given role. */
  emitToRole(role: UserRole, event: string, payload: unknown) {
    this.server?.to(`role:${role}`).emit(event, payload);
  }
}
