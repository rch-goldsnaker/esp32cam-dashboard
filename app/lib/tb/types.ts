export type FrameSizeNum =
  | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export const FRAME_SIZE_LABELS: Record<FrameSizeNum, string> = {
  0: 'QQVGA 160x120',
  1: 'QQVGA 176x144',
  2: 'QCIF 176x208',
  3: 'HQVGA 240x176',
  4: 'QVGA 320x240',
  5: 'CIF 400x296',
  6: 'HVGA 480x320',
  7: 'VGA 640x480',
  8: 'SVGA 800x600',
  9: 'XGA 1024x768',
  10: 'HD 1280x720',
  11: 'SXGA 1280x1024',
  12: 'UXGA 1600x1200',
  13: 'QSXGA',
};

export interface SharedAttributes {
  streamEnabled?: boolean;
  streamUrl?: string;
  streamFps?: number;
  frameSize?: FrameSizeNum;
  imageQuality?: number;
  vflip?: boolean;
  hmirror?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export type RPCMethod =
  | 'setStreamActive'
  | 'setFlash'
  | 'capture';