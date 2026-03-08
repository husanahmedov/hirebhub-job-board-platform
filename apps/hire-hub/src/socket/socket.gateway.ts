import { Logger, Optional, forwardRef, Inject } from '@nestjs/common';
import { OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import * as Websocket from 'ws';
import { JobService } from '../components/job/job.service';

@WebSocketGateway({ transports: ['websocket'], secure: false })
export class SocketGateway implements OnGatewayInit {
	private logger: Logger = new Logger('SocketGateway');
	private clients: Set<Websocket> = new Set();

	constructor(@Optional() @Inject(forwardRef(() => JobService)) private jobService?: JobService) {}

	@WebSocketServer()
	server: Server;

	afterInit(server: Server) {
		this.logger.verbose(`WebSocket server initialized, total clients: ${this.clients.size}`);
	}

	public async handleConnection(client: Websocket, req: any) {
		this.clients.add(client);
		this.logger.verbose(`Client connected: ${client.url || 'unknown'}, total clients: ${this.clients.size}`);

		// Send initial job data to newly connected client
		if (this.jobService) {
			try {
				const jobsData = await this.jobService.countLiveLandingPageJobs();
				this.sendToClient(client, 'InitialJobData', jobsData);
				this.logger.debug(`Sent initial job data to new client`);
			} catch (error) {
				this.logger.error(`Failed to send initial job data: ${error.message}`);
			}
		}
	}

	public handleDisconnect(client: Websocket) {
		this.clients.delete(client);
		this.logger.verbose(`Client disconnected: ${client.url || 'unknown'}, total clients: ${this.clients.size}`);
	}

	// =============================================================================================
	// --------------------------------- // [USER] // ----------------------------------------------
	// =============================================================================================

	/**
	 * Send message to a specific client
	 */
	private sendToClient(client: Websocket, event: string, data: any): void {
		if (client && client.readyState === Websocket.OPEN) {
			try {
				client.send(JSON.stringify({ event, data }));
			} catch (err) {
				this.logger.error(`Failed to send message to client: ${err.message}`);
			}
		}
	}

	public async broardcastUpdate(event: string, data: any) {
		// Use the tracked clients Set instead of server.clients to avoid undefined errors
		if (this.clients && this.clients.size > 0) {
			this.clients.forEach((client) => {
				if (client.readyState === Websocket.OPEN) {
					try {
						client.send(JSON.stringify({ event, data }));
					} catch (err) {
						this.logger.error(`Failed to send message to client: ${err.message}`);
					}
				}
			});
		}
	}

	@SubscribeMessage('RequestLandingLiveJobUpdates')
	public async handleMessage(client: Websocket, payload: any): Promise<{ event: string; data: any }> {
		return { event: 'LandingLiveJobUpdates', data: payload };
	}

	// =============================================================================================
	// --------------------------------- // [ADMIN] // ---------------------------------------------
	// =============================================================================================

	// =============================================================================================
	// --------------------------------- // [RECRUITER] // -----------------------------------------
	// =============================================================================================
}
