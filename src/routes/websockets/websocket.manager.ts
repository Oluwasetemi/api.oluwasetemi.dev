import type { WSContext } from "hono/ws";

type Connection = {
  ws: WSContext;
  userId?: string;
  channels: Set<string>;
  connectedAt: Date;
};

export class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, Connection> = new Map();
  private channels: Map<string, Set<string>> = new Map();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addConnection(connectionId: string, ws: WSContext, userId?: string): void {
    this.connections.set(connectionId, {
      ws,
      userId,
      channels: new Set(),
      connectedAt: new Date(),
    });
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Remove from all channels
      connection.channels.forEach((channel) => {
        this.leaveChannel(connectionId, channel);
      });
      this.connections.delete(connectionId);
    }
  }

  joinChannel(connectionId: string, channel: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.channels.add(channel);

    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(connectionId);

    return true;
  }

  leaveChannel(connectionId: string, channel: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.channels.delete(channel);

    const channelConnections = this.channels.get(channel);
    if (channelConnections) {
      channelConnections.delete(connectionId);
      if (channelConnections.size === 0) {
        this.channels.delete(channel);
      }
    }

    return true;
  }

  broadcast(channel: string, message: any): void {
    const channelConnections = this.channels.get(channel);
    if (!channelConnections) {
      return;
    }

    const messageStr = JSON.stringify(message);
    channelConnections.forEach((connectionId) => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        try {
          connection.ws.send(messageStr);
        }
        catch (error) {
          console.error(`Failed to send message to ${connectionId}:`, error);
          // Remove dead connection
          this.removeConnection(connectionId);
        }
      }
    });
  }

  sendToConnection(connectionId: string, message: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    try {
      connection.ws.send(JSON.stringify(message));
      return true;
    }
    catch (error) {
      console.error(`Failed to send message to ${connectionId}:`, error);
      this.removeConnection(connectionId);
      return false;
    }
  }

  sendToUser(userId: string, message: any): void {
    const messageStr = JSON.stringify(message);
    this.connections.forEach((connection, connectionId) => {
      if (connection.userId === userId) {
        try {
          connection.ws.send(messageStr);
        }
        catch (error) {
          console.error(`Failed to send message to user ${userId} (${connectionId}):`, error);
          this.removeConnection(connectionId);
        }
      }
    });
  }

  getStats() {
    return {
      totalConnections: this.connections.size,
      totalChannels: this.channels.size,
      channelStats: Array.from(this.channels.entries()).map(([channel, connections]) => ({
        channel,
        connections: connections.size,
      })),
    };
  }

  getConnection(connectionId: string): Connection | undefined {
    return this.connections.get(connectionId);
  }

  isConnected(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }
}

export const wsManager = WebSocketManager.getInstance();
