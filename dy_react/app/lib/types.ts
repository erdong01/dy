export interface VideoUrl {
  Id: number;
  Url: string;
  Proxy: string;
  ProxyName: string;
  PlaybackURL: PlaybackURL[];
}

export interface PlaybackURL {
  Url: string;
  Name: string;
}

export interface Video {
  Id: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt: string | null;
  Title: string;
  Describe: string;
  Alias?: string;
  Connection: number;
  Url: string;
  Cover: string;
  VideoGroupId: number;
  Duration?: string;
  ViewCount?: number;
  VideoUrlArr: VideoUrl[];
}
