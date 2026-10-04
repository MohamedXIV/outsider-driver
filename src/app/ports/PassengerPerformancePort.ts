export interface PassengerPerformanceCuePort {
  applyCue(cueName: string): void;
}

export interface PassengerPerformanceControlPort
  extends PassengerPerformanceCuePort {
  setTalk(amount: number): void;
  setBlink(amount: number): void;
  setGaze(x: number, y: number): void;
  setHeadPose(x: number, y: number): void;
  setBodyPose(x: number, y: number): void;
  setExpression(expressionName: string | null): void;
  reset(): void;
}
