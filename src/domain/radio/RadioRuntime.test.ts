import { describe, expect, it } from 'vitest';
import { productionContent } from '../../content/production/ProductionContent';
import { validateProductionContent } from '../../content/validation/ProductionContentValidator';
import {
  SocialStealthStateStore,
  createSocialStealthState,
} from '../social/SocialStealthState';
import { entityId } from '../ids/EntityId';
import { TranslatorRuntime } from '../translator/TranslatorRuntime';
import { TranslatorStateStore } from '../translator/TranslatorState';
import { RadioStateStore } from './RadioState';
import { RadioRuntime } from './RadioRuntime';
import { RadioListeningService } from '../../app/radio/RadioListeningService';

function createValidatedContent() {
  return validateProductionContent(productionContent);
}

function createRadioState() {
  const content = createValidatedContent();

  return new RadioStateStore(
    content.radio,
    {
      translator: content.translator,
      world: content.world,
      jobs: content.jobs,
      passengers: content.passengers,
    },
  );
}

describe('RadioRuntime', () => {
  it('plays scheduled civic radio but does not grant untranslated intel', () => {
    const content = createValidatedContent();
    const radioState = createRadioState();
    const translatorState = new TranslatorStateStore(
      content.translator,
    );
    const social = new SocialStealthStateStore(
      createSocialStealthState({
        id: 'identity:radio-listener',
        displayName: 'Radio Listener',
        attributes: [],
      }),
    );

    radioState.tune(entityId('radio-station', 'civic-one'));
    radioState.setListening(true);

    const service = new RadioListeningService(
      new RadioRuntime(
        radioState,
        new TranslatorRuntime(translatorState),
      ),
      social,
    );
    const result = service.listen({
      day: 3,
      minuteOfDay: 20 * 60,
    });

    expect(result.playback?.broadcast.id).toBe(
      'broadcast:civic-evening-traffic',
    );
    expect(result.playback?.translation.level).toBe('none');
    expect(result.revealedFactIds).toEqual([]);
    expect(
      social.hasFact(entityId('fact', 'docks-checkpoint-traffic')),
    ).toBe(false);
  });

  it('turns understood traffic into persistent route knowledge and authored passenger reaction', () => {
    const content = createValidatedContent();
    const radioState = createRadioState();
    const translatorState = new TranslatorStateStore(
      content.translator,
    );
    const civicPack = entityId(
      'translator-pack',
      'civic-basic-v1',
    );
    translatorState.grantPack(civicPack);
    translatorState.activatePack(civicPack);

    const social = new SocialStealthStateStore(
      createSocialStealthState({
        id: 'identity:radio-listener',
        displayName: 'Radio Listener',
        attributes: [],
      }),
    );

    radioState.tune(entityId('radio-station', 'civic-one'));
    radioState.setListening(true);

    const service = new RadioListeningService(
      new RadioRuntime(
        radioState,
        new TranslatorRuntime(translatorState),
      ),
      social,
    );
    const result = service.listen(
      {
        day: 3,
        minuteOfDay: 20 * 60,
      },
      entityId('passenger', 'official-clinic-rider'),
    );

    expect(result.playback?.translation.level).toBe('full');
    expect(result.playback?.passengerReactionKey).toBe(
      'radio.civic.approved',
    );
    expect(result.revealedFactIds).toEqual([
      entityId('fact', 'docks-checkpoint-traffic'),
    ]);
    expect(
      social.hasFact(entityId('fact', 'docks-checkpoint-traffic')),
    ).toBe(true);
    expect(result.playback?.firstListen).toBe(true);

    const repeated = service.listen({
      day: 4,
      minuteOfDay: 20 * 60,
    });
    expect(repeated.playback?.firstListen).toBe(false);
  });

  it('uses the illegal slang translator pack to unlock underground job intel', () => {
    const content = createValidatedContent();
    const radioState = createRadioState();
    const translatorState = new TranslatorStateStore(
      content.translator,
    );
    const slangPack = entityId(
      'translator-pack',
      'docks-slang-v1',
    );
    translatorState.grantPack(slangPack);
    translatorState.activatePack(slangPack);

    radioState.tune(entityId('radio-station', 'underchannel'));
    radioState.setListening(true);

    const runtime = new RadioRuntime(
      radioState,
      new TranslatorRuntime(translatorState),
    );
    const playback = runtime.listen(
      {
        day: 9,
        minuteOfDay: 21 * 60,
      },
      entityId('passenger', 'underground-clinic-rider'),
    );

    expect(playback?.broadcast.id).toBe(
      'broadcast:underchannel-clinic-window',
    );
    expect(playback?.translation.level).toBe('partial');
    expect(playback?.usableInformation).toEqual([
      {
        type: 'job-intel',
        factId: entityId('fact', 'underground-clinic-window'),
        jobId: entityId('job', 'docks-underground-clinic'),
        minimumComprehension: 2,
      },
    ]);
    expect(playback?.passengerReactionKey).toBe(
      'radio.underchannel.recognition',
    );
  });

  it('returns no programming when listening outside the authored schedule', () => {
    const content = createValidatedContent();
    const radioState = createRadioState();
    radioState.tune(entityId('radio-station', 'civic-one'));
    radioState.setListening(true);

    const runtime = new RadioRuntime(
      radioState,
      new TranslatorRuntime(
        new TranslatorStateStore(content.translator),
      ),
    );

    expect(
      runtime.listen({
        day: 100,
        minuteOfDay: 10 * 60,
      }),
    ).toBeNull();
  });
});
