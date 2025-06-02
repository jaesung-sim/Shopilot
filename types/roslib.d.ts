// types/roslib.d.ts
declare global {
  interface Window {
    ROSLIB?: typeof ROSLIB;
  }
}

declare namespace ROSLIB {
  export const version: string;

  export class Ros {
    constructor(options: { url: string });
    on(
      eventName: 'connection' | 'error' | 'close',
      callback: (error?: any) => void,
    ): void;
    close(): void;
  }

  export class Topic {
    constructor(options: { ros: Ros; name: string; messageType: string });
    subscribe(callback: (message: any) => void): void;
    unsubscribe(): void;
    publish(message: Message): void;
  }

  export class Message {
    constructor(values?: Record<string, any>);
  }

  export class Service {
    constructor(options: { ros: Ros; name: string; serviceType: string });
    callService(request: ServiceRequest, callback: (result: any) => void): void;
  }

  export class ServiceRequest {
    constructor(values?: Record<string, any>);
  }

  export namespace geometry_msgs {
    export interface Point {
      x: number;
      y: number;
      z: number;
    }

    export interface Twist {
      linear: {
        x: number;
        y: number;
        z: number;
      };
      angular: {
        x: number;
        y: number;
        z: number;
      };
    }
  }
}

export = ROSLIB;
export as namespace ROSLIB;
