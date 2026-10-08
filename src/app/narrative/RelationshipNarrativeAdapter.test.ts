import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { entityId } from '../../domain/ids/EntityId';
import { RelationshipStateStore } from '../../domain/relationships/RelationshipState';
import {
  SocialStealthStateStore,
  createSocialStealthState,
} from '../../domain/social/SocialStealthState';
import { InkNarrativeRuntime } from '../../narrative/InkNarrativeRuntime';
import { SocialStealthNarrativeAdapter } from './SocialStealthNarrativeAdapter';
import {
  RelationshipNarrativeAdapter,
  withRelationshipNarrativeEvents,
  withRelationshipNarrativeQueries,
} from './RelationshipNarrativeAdapter';

const story = [
  'EXTERNAL GAME_RELATIONSHIP(passenger_id, dimension)',
  'EXTERNAL GAME_HUMAN_ATTITUDE(passenger_id)',
  'EXTERNAL GAME_ADJUST_RELATIONSHIP(passenger_id, dimension, delta, reason)',
  'EXTERNAL GAME_ADJUST_HUMAN_ATTITUDE(passenger_id, delta, reason)',
  '-> start',
  '',
  '=== start ===',
  '~ temp trust = GAME_RELATIONSHIP("passenger:underground-clinic-rider", "trust")',
  '~ temp human_attitude = GAME_HUMAN_ATTITUDE("passenger:underground-clinic-rider")',
  '{ trust >= 80:',
  '    Passenger: I trust you.',
  '}',
  '{ human_attitude <= -20:',
  '    Passenger: But humans are dangerous.',
  '}',
  '~ GAME_ADJUST_RELATIONSHIP("passenger:underground-clinic-rider", "trust", 5, "ride.shared-risk")',
  '~ GAME_ADJUST_HUMAN_ATTITUDE("passenger:underground-clinic-rider", 10, "human.reconsidered")',
  '-> END',
].join('\n');

describe('RelationshipNarrativeAdapter', () => {
  it('lets Ink react to closeness and human attitude as independent truths', () => {
    const relationships = new RelationshipStateStore(
      productionContent.relationships,
    );
    const passengerId = entityId(
      'passenger',
      'underground-clinic-rider',
    );
    relationships.adjustMetric(
      passengerId,
      'trust',
      70,
      'ride.kept-confidence',
    );

    const social = new SocialStealthNarrativeAdapter(
      new SocialStealthStateStore(
        createSocialStealthState({
          id: 'identity:relationship-ink',
          displayName: 'Relationship Ink',
          attributes: [],
        }),
      ),
    );
    const relationshipAdapter =
      new RelationshipNarrativeAdapter(relationships);
    const runtime = InkNarrativeRuntime.fromInkSource(
      story,
      withRelationshipNarrativeQueries(
        social,
        relationshipAdapter,
      ),
      withRelationshipNarrativeEvents(
        social,
        relationshipAdapter,
      ),
    );

    const turn = runtime.continueUntilChoiceOrEnd();
    const lines = turn.lines.map((line) => line.text);

    expect(lines).toContain('Passenger: I trust you.');
    expect(lines).toContain(
      'Passenger: But humans are dangerous.',
    );
    expect(relationships.getMetric(passengerId, 'trust')).toBe(90);
    expect(relationships.getHumanAttitude(passengerId)).toBe(-35);
  });

  it('preserves prototype-backed social queries when composing relationship queries', () => {
    const state = new SocialStealthStateStore(
      createSocialStealthState({
        id: 'identity:query-composition',
        displayName: 'Query Composition',
        attributes: [],
      }),
    );
    const knownFact = entityId('fact', 'docks-checkpoint-rumor');
    state.learnFact(knownFact);
    const relationships = new RelationshipStateStore(
      productionContent.relationships,
    );
    const composed = withRelationshipNarrativeQueries(
      new SocialStealthNarrativeAdapter(state),
      new RelationshipNarrativeAdapter(relationships),
    );

    expect(composed.hasFact(knownFact)).toBe(true);
    expect(composed.hasClaim(entityId('claim', 'nonexistent'))).toBe(false);
    expect(composed.getCityAttention()).toBe(0);
    expect(composed.getPassengerSuspicion(
      entityId('passenger', 'underground-clinic-rider'),
    )).toBe(0);
  });

  it('fails clearly if relationship events are sent to the social sink alone', () => {
    const social = new SocialStealthNarrativeAdapter(
      new SocialStealthStateStore(
        createSocialStealthState({
          id: 'identity:relationship-routing',
          displayName: 'Relationship Routing',
          attributes: [],
        }),
      ),
    );

    expect(() => {
      social.emit({
        type: 'relationship.adjust',
        passengerId: entityId(
          'passenger',
          'underground-clinic-rider',
        ),
        dimension: 'trust',
        delta: 5,
        reason: 'routing.test',
      });
    }).toThrow(/compose a relationship event sink/);
  });
});
