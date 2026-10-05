import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { validateProductionContent } from '../../content/validation/ProductionContentValidator';
import { entityId } from '../../domain/ids/EntityId';
import { PersonalPersistenceStateStore } from '../../domain/personal/PersonalPersistenceState';
import { PersonalSpaceStateStore } from '../../domain/spaces/PersonalSpaceState';
import { PersonalSpaceOrchestrator } from '../spaces/PersonalSpaceOrchestrator';
import { PersonalSpacePersistenceProjection } from './PersonalSpacePersistenceProjection';

describe('PersonalSpacePersistenceProjection', () => {
  it('projects unread callbacks and maintenance into existing authored space flags', () => {
    const content = validateProductionContent(productionContent);
    const personal = new PersonalPersistenceStateStore(
      content.personalPersistence,
      content.passengers,
    );
    const spaces = new PersonalSpaceStateStore(
      content.personalSpaces,
    );
    const orchestrator = new PersonalSpaceOrchestrator(
      spaces,
      {
        showPersonalSpace: () => undefined,
        refreshPersonalSpaceFlags: () => undefined,
        showTaxi: () => undefined,
      },
    );
    const projection = new PersonalSpacePersistenceProjection(
      personal,
      orchestrator,
    );

    personal.adjustTaxiCondition(-35);
    personal.reportMaintenanceIssue('brake-pads-worn');
    personal.deliverMessage(
      entityId('message', 'first-shift-callback'),
    );
    projection.refresh();

    expect(
      spaces.getFlag(
        entityId('personal-space', 'garage'),
        'inspection-light',
      ),
    ).toBe(true);
    expect(
      spaces.getFlag(
        entityId('personal-space', 'home'),
        'message-indicator',
      ),
    ).toBe(true);

    personal.resolveMaintenanceIssue('brake-pads-worn');
    personal.adjustTaxiCondition(20);
    personal.readMessage(
      entityId('message', 'first-shift-callback'),
    );
    projection.refresh();

    expect(
      spaces.getFlag(
        entityId('personal-space', 'garage'),
        'inspection-light',
      ),
    ).toBe(false);
    expect(
      spaces.getFlag(
        entityId('personal-space', 'home'),
        'message-indicator',
      ),
    ).toBe(false);
  });
});
