export function createPassengerFixture(): unknown {
  return {
    schemaVersion: 1,
    passengers: [
      {
        schemaVersion: 1,
        id: 'passenger:routine-rider',
        data: {
          displayName: 'Routine Rider',
          lifecycleKind: 'routine',
          narrativeStoryId: 'foundation-passenger',
        },
      },
      {
        schemaVersion: 1,
        id: 'passenger:recurring-rider',
        data: {
          displayName: 'Recurring Rider',
          lifecycleKind: 'recurring',
          narrativeStoryId: 'foundation-passenger',
        },
      },
      {
        schemaVersion: 1,
        id: 'passenger:story-rider',
        data: {
          displayName: 'Story Rider',
          lifecycleKind: 'story',
          narrativeStoryId: 'foundation-passenger',
        },
      },
    ],
  };
}
