import {
  advanceRouteProgress,
  buildNavigationPrompt,
  buildNavigationSpeechText,
  estimateRemainingDuration,
  evaluateOffRouteReroute,
  resolveFusedNavigationHeading,
  resolveRouteInstruction,
  type NavigationPromptKeySet,
  type RouteProgress,
} from '../navigationGuidance';

const point = (latitude: number, longitude: number) => ({
  latitude,
  longitude,
});

describe('navigation guidance', () => {
  it('shrinks a straight route monotonically as GPS advances', () => {
    const route = [point(21, 105), point(21, 105.01)];
    const first = advanceRouteProgress(route, point(21, 105.002));
    const second = [105.0035, 105.005, 105.006].reduce(
      (progress, longitude) =>
        advanceRouteProgress(route, point(21, longitude), progress.cursor),
      first,
    );

    expect(first.remainingPath[0].longitude).toBeCloseTo(105.002, 4);
    expect(second.remainingPath[0].longitude).toBeCloseTo(105.006, 4);
    expect(second.remainingDistanceMeters).toBeLessThan(
      first.remainingDistanceMeters,
    );
    expect(second.cursor.distanceAlongMeters).toBeGreaterThanOrEqual(
      first.cursor.distanceAlongMeters,
    );
  });

  it('keeps progress on the current leg when a parallel future leg is closer', () => {
    const route = [
      point(21, 105),
      point(21, 105.01),
      point(21.0005, 105.01),
      point(21.0005, 105),
    ];
    const first = advanceRouteProgress(route, point(21, 105.008));
    const noisyParallelFix = advanceRouteProgress(
      route,
      point(21.00049, 105.0081),
      first.cursor,
    );

    expect(noisyParallelFix.cursor.segmentIndex).toBeLessThanOrEqual(1);
    expect(noisyParallelFix.cursor.distanceAlongMeters).toBeLessThan(1100);
    expect(noisyParallelFix.offRouteDistanceMeters).toBeGreaterThan(30);
  });

  it('uses Google steps for multiple turns and keeps a stable instruction id', () => {
    const route = [
      point(21, 105),
      point(21, 105.002),
      point(21.002, 105.002),
      point(21.002, 105.004),
    ];
    const steps = [
      {
        instruction: 'Đi thẳng',
        maneuver: 'straight',
        distanceMeters: 200,
        durationSeconds: 30,
        startLocation: route[0],
      },
      {
        instruction: 'Rẽ trái vào đường A',
        maneuver: 'turn-left',
        distanceMeters: 200,
        durationSeconds: 30,
        startLocation: route[1],
      },
      {
        instruction: 'Rẽ phải vào đường B',
        maneuver: 'turn-right',
        distanceMeters: 200,
        durationSeconds: 30,
        startLocation: route[2],
      },
    ];
    const beforeTurn = advanceRouteProgress(route, point(21, 105.001));
    const closer = advanceRouteProgress(
      route,
      point(21, 105.0014),
      beforeTurn.cursor,
    );
    const firstInstruction = resolveRouteInstruction({
      routePath: route,
      progress: beforeTurn,
      routeSteps: steps,
      destinationTitle: 'Điểm đến',
    });
    const closerInstruction = resolveRouteInstruction({
      routePath: route,
      progress: closer,
      routeSteps: steps,
      destinationTitle: 'Điểm đến',
    });
    const afterFirstTurn = advanceRouteProgress(
      route,
      point(21.001, 105.002),
      closer.cursor,
    );
    const nextInstruction = resolveRouteInstruction({
      routePath: route,
      progress: afterFirstTurn,
      routeSteps: steps,
      destinationTitle: 'Điểm đến',
    });

    expect(firstInstruction?.source).toBe('google_step');
    expect(firstInstruction?.maneuver).toBe('left');
    expect(closerInstruction?.id).toBe(firstInstruction?.id);
    expect(nextInstruction?.source).toBe('google_step');
    expect(nextInstruction?.maneuver).toBe('right');
    expect(nextInstruction?.id).not.toBe(firstInstruction?.id);
  });

  it('uses one heading for the route, GPS course and marker without reversing', () => {
    const heading = resolveFusedNavigationHeading({
      routeHeading: 90,
      gpsHeading: 270,
      deviceHeading: 265,
      previousHeading: 88,
      speedMetersPerSecond: 2,
      isOnRoute: true,
    });

    expect(Math.abs(heading - 90)).toBeLessThan(25);

    const wrapped = resolveFusedNavigationHeading({
      routeHeading: 10,
      gpsHeading: 8,
      deviceHeading: null,
      previousHeading: 350,
      speedMetersPerSecond: 4,
      isOnRoute: true,
    });
    expect(wrapped > 350 || wrapped < 25).toBe(true);
  });

  it('announces each turn phase once instead of keying prompts by distance', () => {
    const spoken: NavigationPromptKeySet = new Set();
    const instruction = {
      id: 'step:1:21.00000:105.00200',
      source: 'google_step' as const,
      stepIndex: 1,
      distanceMeters: 260,
      label: '260 m nữa',
      detail: 'Rẽ trái vào đường A',
      maneuver: 'left' as const,
    };

    const prepare = buildNavigationPrompt(instruction, 'driving', spoken);
    expect(prepare?.phase).toBe('prepare');
    spoken.add(prepare!.key);
    expect(
      buildNavigationPrompt(
        { ...instruction, distanceMeters: 230, label: '230 m nữa' },
        'driving',
        spoken,
      ),
    ).toBeNull();

    const soon = buildNavigationPrompt(
      { ...instruction, distanceMeters: 90, label: '90 m nữa' },
      'driving',
      spoken,
    );
    expect(soon?.phase).toBe('soon');
    spoken.add(soon!.key);

    const now = buildNavigationPrompt(
      { ...instruction, distanceMeters: 24, label: '24 m nữa' },
      'driving',
      spoken,
    );
    expect(now?.phase).toBe('now');
    expect(now?.shouldVibrate).toBe(true);
    spoken.add(now!.key);
    expect(
      buildNavigationPrompt(
        { ...instruction, distanceMeters: 18, label: '18 m nữa' },
        'driving',
        spoken,
      ),
    ).toBeNull();
  });

  it('builds concise phase-aware speech without repeating road details', () => {
    const instruction = {
      id: 'step:1:21.00000:105.00200',
      source: 'google_step' as const,
      stepIndex: 1,
      distanceMeters: 260,
      label: '260 m nữa',
      detail:
        'Rẽ trái vào đường Nguyễn Trãi hướng về Ngã Tư Sở rồi tiếp tục trong 2 km',
      maneuver: 'left' as const,
    };

    expect(buildNavigationSpeechText(instruction, 'prepare')).toBe(
      'Sau 300 mét, rẽ trái vào đường Nguyễn Trãi.',
    );
    expect(
      buildNavigationSpeechText(
        { ...instruction, distanceMeters: 90, label: '90 m nữa' },
        'soon',
      ),
    ).toBe('Sắp tới, rẽ trái.');
    expect(
      buildNavigationSpeechText(
        { ...instruction, distanceMeters: 24, label: '24 m nữa' },
        'now',
      ),
    ).toBe('Rẽ trái.');
  });

  it('uses dedicated short prompts for route starts, roundabouts and arrival', () => {
    const base = {
      id: 'step:0:21.00000:105.00000',
      source: 'google_step' as const,
      stepIndex: 0,
      distanceMeters: 1,
      label: 'Bắt đầu',
    };

    expect(
      buildNavigationSpeechText(
        {
          ...base,
          detail: 'Đi thẳng trên đường Phạm Hùng',
          maneuver: 'straight',
        },
        'start',
      ),
    ).toBe('Bắt đầu, đi thẳng trên đường Phạm Hùng.');
    expect(
      buildNavigationSpeechText(
        {
          ...base,
          distanceMeters: 280,
          detail:
            'Tại vòng xuyến, đi theo lối ra thứ 2 vào đường Lê Đức Thọ',
          maneuver: 'roundabout',
        },
        'prepare',
      ),
    ).toBe('Sau 300 mét, tại vòng xuyến, đi theo lối ra thứ 2.');
    expect(
      buildNavigationSpeechText(
        {
          ...base,
          label: 'Sắp đến Bến xe Mỹ Đình',
          detail: undefined,
          maneuver: 'arrive',
        },
        'arrive',
      ),
    ).toBe('Sắp đến Bến xe Mỹ Đình.');
  });

  it.each([
    ['Ng.7 Huy Du', 'ngõ 7 Huy Du'],
    ['Đ. Võ Chí Công', 'đường Võ Chí Công'],
    ['P. Huế', 'phố Huế'],
    ['QL.1A', 'quốc lộ 1A'],
    ['ĐT.743', 'đường tỉnh 743'],
    ['TL.10', 'tỉnh lộ 10'],
    ['ĐH.02', 'đường huyện 02'],
    ['ĐX.5', 'đường xã 5'],
    ['CT.01', 'cao tốc 01'],
    ['ĐCT. Bắc Nam', 'đường cao tốc Bắc Nam'],
    ['VĐ.3', 'vành đai 3'],
  ])('expands Vietnamese road prefix %s for speech', (raw, expanded) => {
    expect(
      buildNavigationSpeechText(
        {
          id: `road:${raw}`,
          source: 'google_step',
          stepIndex: 0,
          distanceMeters: 1,
          label: 'Bắt đầu',
          detail: `Đi thẳng trên ${raw}`,
          maneuver: 'straight',
        },
        'start',
      ),
    ).toBe(`Bắt đầu, đi thẳng trên ${expanded}.`);
  });

  it('keeps unknown dotted road abbreviations and stops at a real next sentence', () => {
    expect(
      buildNavigationSpeechText(
        {
          id: 'road:unknown',
          source: 'google_step',
          stepIndex: 0,
          distanceMeters: 1,
          label: 'Bắt đầu',
          detail: 'Đi thẳng trên ABC. 12. Sau đó rẽ phải',
          maneuver: 'straight',
        },
        'start',
      ),
    ).toBe('Bắt đầu, đi thẳng trên ABC. 12.');
  });

  it('preserves Google ramp and roundabout maneuvers for voice guidance', () => {
    const route = [point(21, 105), point(21, 105.002)];
    const progress = advanceRouteProgress(route, point(21, 105.0002));
    const instruction = resolveRouteInstruction({
      routePath: route,
      progress,
      routeSteps: [
        {
          instruction: 'Đi vào đường nhánh bên phải',
          maneuver: 'ramp-right',
          distanceMeters: 180,
          durationSeconds: 30,
          startLocation: point(21, 105.0018),
        },
      ],
    });

    expect(instruction?.maneuver).toBe('ramp-right');
    expect(
      instruction && buildNavigationSpeechText(instruction, 'now'),
    ).toBe('Đi vào đường nhánh bên phải.');
  });

  it('requires a sustained off-route GPS sequence and enforces reroute cooldown', () => {
    const route = [point(21, 105), point(21, 105.01)];
    let progress = advanceRouteProgress(route, point(21.00045, 105.004));
    let tracker = evaluateOffRouteReroute({
      offRouteDistanceMeters: progress.offRouteDistanceMeters,
      horizontalAccuracyMeters: 8,
      now: 1000,
      state: null,
    });
    expect(tracker.shouldReroute).toBe(false);

    progress = advanceRouteProgress(
      route,
      point(21.00048, 105.0045),
      progress.cursor,
    );
    tracker = evaluateOffRouteReroute({
      offRouteDistanceMeters: progress.offRouteDistanceMeters,
      horizontalAccuracyMeters: 8,
      now: 5900,
      state: tracker.state,
    });
    expect(tracker.shouldReroute).toBe(false);

    progress = advanceRouteProgress(
      route,
      point(21.0005, 105.005),
      progress.cursor,
    );
    tracker = evaluateOffRouteReroute({
      offRouteDistanceMeters: progress.offRouteDistanceMeters,
      horizontalAccuracyMeters: 8,
      now: 6100,
      state: tracker.state,
    });
    expect(tracker.shouldReroute).toBe(true);

    const cooldown = evaluateOffRouteReroute({
      offRouteDistanceMeters: 55,
      horizontalAccuracyMeters: 8,
      now: 9000,
      state: tracker.state,
    });
    expect(cooldown.shouldReroute).toBe(false);

    progress = advanceRouteProgress(
      route,
      point(21.00002, 105.0055),
      progress.cursor,
    );
    const recovered = evaluateOffRouteReroute({
      offRouteDistanceMeters: progress.offRouteDistanceMeters,
      horizontalAccuracyMeters: 8,
      now: 10000,
      state: cooldown.state,
    });
    expect(recovered.state.offRouteSince).toBeNull();
  });

  it('reduces remaining duration with route progress', () => {
    const progress = {
      totalDistanceMeters: 1000,
      remainingDistanceMeters: 250,
    } as RouteProgress;

    expect(estimateRemainingDuration(600, progress)).toBe(150);
  });
});
