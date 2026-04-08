export interface Post {
  id: string;
  originalText: string;
  translatedText: string;
  timestamp: number;
}

export interface Settings {
  lastProcessedId: string;
  checkInterval: number;
}
