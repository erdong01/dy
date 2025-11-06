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


/**
 * @description 分类表
 */
export interface Category {
  /**
   * @description 主键ID
   */
  id: number;

  /**
   * @description 创建时间
   */
  createdAt: string | null;

  /**
   * @description 更新时间
   */
  updatedAt: string | null;

  /**
   * @description 删除时间
   */
  deletedAt: string | null;

  /**
   * @description 分类名称
   */
  name: string | null;

  /**
   * @description 父级ID
   */
  parentId: number | null;

  /**
   * @description 类型
   */
  type: number | null;

  /**
   * @description 是否隐藏
   */
  isHide: number | null;

  /**
   * @description 类型ID
   */
  typeId: number | null;

  /**
   * @description 类型父ID
   */
  typePid: number | null;

  SonCategory: Category[];
}