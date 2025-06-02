// lib/coordinateTransform.ts - ROS ↔ 웹 좌표 변환 시스템

export interface Point2D {
  x: number;
  y: number;
}

export interface TransformParameters {
  // 변환 행렬 파라미터
  translation: Point2D; // 평행 이동 (tx, ty)
  rotation: number; // 회전 각도 (라디안)
  scale: Point2D; // 스케일 (sx, sy)

  // 변환 활성화 여부
  enabled: boolean;

  // 캘리브레이션 정보
  calibrationPoints?: CalibrationPoint[];
  calibrationDate?: Date;
  accuracy?: number; // 변환 정확도 (픽셀 단위)
}

export interface CalibrationPoint {
  id: string;
  description: string;
  webCoord: Point2D; // 웹 맵에서의 좌표
  rosCoord: Point2D; // ROS에서 받은 좌표
  timestamp: Date;
}

// 기본 변환 파라미터 (초기값)
const DEFAULT_TRANSFORM: TransformParameters = {
  translation: { x: 0, y: 0 },
  rotation: 0,
  scale: { x: 1, y: 1 },
  enabled: false,
  accuracy: 0,
};

export class CoordinateTransformManager {
  private transform: TransformParameters = { ...DEFAULT_TRANSFORM };
  private calibrationPoints: CalibrationPoint[] = [];

  constructor() {
    this.loadTransformFromStorage();
  }

  // ROS 좌표를 웹 좌표로 변환
  public rosToWeb(rosPoint: Point2D): Point2D {
    if (!this.transform.enabled) {
      return { ...rosPoint };
    }

    const { translation, rotation, scale } = this.transform;

    // 1. 스케일 적용
    let x = rosPoint.x * scale.x;
    let y = rosPoint.y * scale.y;

    // 2. 회전 적용
    if (rotation !== 0) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      x = rotatedX;
      y = rotatedY;
    }

    // 3. 평행이동 적용
    x += translation.x;
    y += translation.y;

    return { x, y };
  }

  // 웹 좌표를 ROS 좌표로 변환 (역변환)
  public webToRos(webPoint: Point2D): Point2D {
    if (!this.transform.enabled) {
      return { ...webPoint };
    }

    const { translation, rotation, scale } = this.transform;

    // 1. 평행이동 역변환
    let x = webPoint.x - translation.x;
    let y = webPoint.y - translation.y;

    // 2. 회전 역변환
    if (rotation !== 0) {
      const cos = Math.cos(-rotation);
      const sin = Math.sin(-rotation);
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      x = rotatedX;
      y = rotatedY;
    }

    // 3. 스케일 역변환
    x /= scale.x;
    y /= scale.y;

    return { x, y };
  }

  // 캘리브레이션 포인트 추가
  public addCalibrationPoint(
    id: string,
    description: string,
    webCoord: Point2D,
    rosCoord: Point2D,
  ): void {
    const calibrationPoint: CalibrationPoint = {
      id,
      description,
      webCoord: { ...webCoord },
      rosCoord: { ...rosCoord },
      timestamp: new Date(),
    };

    // 기존 포인트 제거 (같은 ID)
    this.calibrationPoints = this.calibrationPoints.filter((p) => p.id !== id);

    // 새 포인트 추가
    this.calibrationPoints.push(calibrationPoint);

    console.log(
      `📍 캘리브레이션 포인트 추가: ${description}`,
      calibrationPoint,
    );

    // 3개 이상의 포인트가 있으면 자동 계산
    if (this.calibrationPoints.length >= 3) {
      this.calculateTransformFromCalibration();
    }

    this.saveTransformToStorage();
  }

  // 최소제곱법을 이용한 변환 파라미터 자동 계산
  private calculateTransformFromCalibration(): void {
    if (this.calibrationPoints.length < 3) {
      console.warn('⚠️ 캘리브레이션 포인트가 3개 미만입니다');
      return;
    }

    console.log('🔢 캘리브레이션 포인트를 이용한 변환 파라미터 계산 시작');

    try {
      // 아핀 변환 행렬 계산 (최소제곱법)
      const result = this.calculateAffineTransform(this.calibrationPoints);

      if (result) {
        this.transform = {
          ...this.transform,
          ...result,
          enabled: true,
          calibrationPoints: [...this.calibrationPoints],
          calibrationDate: new Date(),
        };

        console.log('✅ 변환 파라미터 계산 완료:', {
          translation: this.transform.translation,
          rotation: (this.transform.rotation * 180) / Math.PI, // 도 단위로 표시
          scale: this.transform.scale,
          accuracy: this.transform.accuracy,
        });
      } else {
        console.error('❌ 변환 파라미터 계산 실패');
      }
    } catch (error) {
      console.error('❌ 캘리브레이션 계산 중 오류:', error);
    }
  }

  // 아핀 변환 계산 (최소제곱법)
  private calculateAffineTransform(
    points: CalibrationPoint[],
  ): Partial<TransformParameters> | null {
    if (points.length < 3) return null;

    try {
      // 중심점 계산
      const rosCenter = this.calculateCentroid(points.map((p) => p.rosCoord));
      const webCenter = this.calculateCentroid(points.map((p) => p.webCoord));

      // 중심점 기준으로 정규화된 좌표
      const normalizedRos = points.map((p) => ({
        x: p.rosCoord.x - rosCenter.x,
        y: p.rosCoord.y - rosCenter.y,
      }));

      const normalizedWeb = points.map((p) => ({
        x: p.webCoord.x - webCenter.x,
        y: p.webCoord.y - webCenter.y,
      }));

      // 스케일 계산
      let sumRosSquared = 0;
      let sumWebSquared = 0;

      normalizedRos.forEach((p) => {
        sumRosSquared += p.x * p.x + p.y * p.y;
      });

      normalizedWeb.forEach((p) => {
        sumWebSquared += p.x * p.x + p.y * p.y;
      });

      const avgScale =
        sumWebSquared > 0 ? Math.sqrt(sumWebSquared / sumRosSquared) : 1;

      // 회전각 계산 (크로스 곱적 이용)
      let sumCross = 0;
      let sumDot = 0;

      for (let i = 0; i < normalizedRos.length; i++) {
        const ros = normalizedRos[i];
        const web = normalizedWeb[i];

        sumCross += ros.x * web.y - ros.y * web.x;
        sumDot += ros.x * web.x + ros.y * web.y;
      }

      const rotation = Math.atan2(sumCross, sumDot);

      // 변환 후 오차 계산
      const testTransform = {
        translation: {
          x:
            webCenter.x -
            (rosCenter.x * avgScale * Math.cos(rotation) -
              rosCenter.y * avgScale * Math.sin(rotation)),
          y:
            webCenter.y -
            (rosCenter.x * avgScale * Math.sin(rotation) +
              rosCenter.y * avgScale * Math.cos(rotation)),
        },
        rotation,
        scale: { x: avgScale, y: avgScale },
      };

      // 정확도 검증
      let totalError = 0;
      points.forEach((point) => {
        const transformed = this.applyTransform(point.rosCoord, testTransform);
        const error = Math.sqrt(
          Math.pow(transformed.x - point.webCoord.x, 2) +
            Math.pow(transformed.y - point.webCoord.y, 2),
        );
        totalError += error;
      });

      const averageError = totalError / points.length;

      return {
        translation: testTransform.translation,
        rotation: testTransform.rotation,
        scale: testTransform.scale,
        accuracy: averageError,
      };
    } catch (error) {
      console.error('아핀 변환 계산 오류:', error);
      return null;
    }
  }

  // 중심점 계산
  private calculateCentroid(points: Point2D[]): Point2D {
    const sum = points.reduce(
      (acc, p) => ({
        x: acc.x + p.x,
        y: acc.y + p.y,
      }),
      { x: 0, y: 0 },
    );

    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  }

  // 변환 적용 (내부 계산용)
  private applyTransform(point: Point2D, transform: any): Point2D {
    const { translation, rotation, scale } = transform;

    let x = point.x * scale.x;
    let y = point.y * scale.y;

    if (rotation !== 0) {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rotatedX = x * cos - y * sin;
      const rotatedY = x * sin + y * cos;
      x = rotatedX;
      y = rotatedY;
    }

    x += translation.x;
    y += translation.y;

    return { x, y };
  }

  // 수동 변환 파라미터 설정
  public setTransformParameters(params: Partial<TransformParameters>): void {
    this.transform = { ...this.transform, ...params };
    this.saveTransformToStorage();

    console.log('🔧 변환 파라미터 수동 설정:', params);
  }

  // 현재 변환 파라미터 가져오기
  public getTransformParameters(): TransformParameters {
    return { ...this.transform };
  }

  // 변환 활성화/비활성화
  public setEnabled(enabled: boolean): void {
    this.transform.enabled = enabled;
    this.saveTransformToStorage();

    console.log(`🔄 좌표 변환 ${enabled ? '활성화' : '비활성화'}`);
  }

  // 캘리브레이션 포인트 목록 가져오기
  public getCalibrationPoints(): CalibrationPoint[] {
    return [...this.calibrationPoints];
  }

  // 캘리브레이션 포인트 제거
  public removeCalibrationPoint(id: string): void {
    this.calibrationPoints = this.calibrationPoints.filter((p) => p.id !== id);
    this.saveTransformToStorage();

    console.log(`🗑️ 캘리브레이션 포인트 제거: ${id}`);

    // 3개 미만이 되면 변환 비활성화
    if (this.calibrationPoints.length < 3) {
      this.setEnabled(false);
      console.warn(
        '⚠️ 캘리브레이션 포인트가 3개 미만이므로 변환이 비활성화됩니다',
      );
    } else {
      this.calculateTransformFromCalibration();
    }
  }

  // 모든 캘리브레이션 포인트 제거
  public clearCalibrationPoints(): void {
    this.calibrationPoints = [];
    this.setEnabled(false);
    this.saveTransformToStorage();

    console.log('🧹 모든 캘리브레이션 포인트 제거');
  }

  // 로컬 스토리지에 변환 정보 저장
  private saveTransformToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const data = {
          transform: this.transform,
          calibrationPoints: this.calibrationPoints,
        };
        localStorage.setItem(
          'shopilot_coordinate_transform',
          JSON.stringify(data),
        );
      } catch (error) {
        console.warn('변환 정보 저장 실패:', error);
      }
    }
  }

  // 로컬 스토리지에서 변환 정보 로드
  private loadTransformFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('shopilot_coordinate_transform');
        if (stored) {
          const data = JSON.parse(stored);
          this.transform = { ...DEFAULT_TRANSFORM, ...data.transform };
          this.calibrationPoints = data.calibrationPoints || [];

          console.log('📂 저장된 변환 정보 로드:', {
            enabled: this.transform.enabled,
            calibrationPoints: this.calibrationPoints.length,
            accuracy: this.transform.accuracy,
          });
        }
      } catch (error) {
        console.warn('변환 정보 로드 실패:', error);
        this.transform = { ...DEFAULT_TRANSFORM };
        this.calibrationPoints = [];
      }
    }
  }

  // 변환 정확도 테스트
  public testAccuracy(): {
    averageError: number;
    maxError: number;
    details: any[];
  } {
    if (!this.transform.enabled || this.calibrationPoints.length === 0) {
      return { averageError: 0, maxError: 0, details: [] };
    }

    const details: any[] = [];
    let totalError = 0;
    let maxError = 0;

    this.calibrationPoints.forEach((point) => {
      const transformed = this.rosToWeb(point.rosCoord);
      const error = Math.sqrt(
        Math.pow(transformed.x - point.webCoord.x, 2) +
          Math.pow(transformed.y - point.webCoord.y, 2),
      );

      totalError += error;
      maxError = Math.max(maxError, error);

      details.push({
        id: point.id,
        description: point.description,
        expected: point.webCoord,
        actual: transformed,
        error: error,
      });
    });

    const averageError = totalError / this.calibrationPoints.length;

    return { averageError, maxError, details };
  }
}

// 전역 변환 관리자 인스턴스
export const coordinateTransform = new CoordinateTransformManager();

// 편의 함수들
export function rosToWeb(point: Point2D): Point2D {
  return coordinateTransform.rosToWeb(point);
}

export function webToRos(point: Point2D): Point2D {
  return coordinateTransform.webToRos(point);
}

export function addCalibrationPoint(
  id: string,
  description: string,
  webCoord: Point2D,
  rosCoord: Point2D,
): void {
  coordinateTransform.addCalibrationPoint(id, description, webCoord, rosCoord);
}

export function setTransformEnabled(enabled: boolean): void {
  coordinateTransform.setEnabled(enabled);
}

// 미리 정의된 캘리브레이션 포인트들 (실제 측정 후 값 수정 필요)
export const PREDEFINED_CALIBRATION_POINTS = [
  {
    id: 'point1',
    description: '1번 위치',
    webCoord: { x: 218, y: 192 },
    rosCoord: { x: 39.16, y: -54.16 }, // 실제 ROS 좌표로 수정 필요
  },
  {
    id: 'point2',
    description: '2번 위치',
    webCoord: { x: 201, y: 361 },
    rosCoord: { x: 57.01, y: -47.48 }, // 실제 ROS 좌표로 수정 필요
  },
  {
    id: 'point3',
    description: '3번 위치',
    webCoord: { x: 672, y: 249 },
    rosCoord: { x: 22.59, y: 2.61 }, // 실제 ROS 좌표로 수정 필요
  },
  {
    id: 'point4',
    description: '4번 위치',
    webCoord: { x: 557, y: 80 },
    rosCoord: { x: 7.62, y: -17.48 }, // 실제 ROS 좌표로 수정 필요
  },
];

// 개발/테스트용 함수들
export function loadPredefinedCalibrationPoints(): void {
  console.log('🔧 미리 정의된 캘리브레이션 포인트 로드 (개발용)');

  PREDEFINED_CALIBRATION_POINTS.forEach((point) => {
    coordinateTransform.addCalibrationPoint(
      point.id,
      point.description,
      point.webCoord,
      point.rosCoord,
    );
  });
}

export function generateTestTransform(): void {
  console.log('🧪 테스트용 변환 파라미터 생성');

  coordinateTransform.setTransformParameters({
    translation: { x: 50, y: 30 },
    rotation: 0.1, // 약 5.7도
    scale: { x: 1.1, y: 1.1 },
    enabled: true,
  });
}
