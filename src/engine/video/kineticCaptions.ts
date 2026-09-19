/**
 * Kinetic Word Captions & Subtitle Chunking Engine
 * Ingests word-level Whisper transcription timestamps, clusters into phrase cards,
 * and creates animated GroupLayer + ChunkLayer hierarchies for 4 kinetic presets:
 * - spotlight (karaoke emphasis on active word)
 * - hormozi (bold pop with bouncy physics)
 * - cascade (snappy slide-up reveals)
 * - dynamicIsland (pill badge container)
 */

import { GroupLayer, ChunkLayer } from '@/types/scene';

export interface WhisperWord {
  word: string;
  start: number;       // in seconds
  end: number;         // in seconds
  probability?: number;
}

export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: WhisperWord[];
}

export type WhisperTranscript = WhisperSegment[];

export interface CaptionCard {
  start: number;
  end: number;
  words: WhisperWord[];
}

export interface ChunkOptions {
  maxWordsPerCard?: number;
  maxCardDuration?: number; // seconds
}

/**
 * Clusters word-level timestamps into readable phrase cards
 * respecting maximum word limits, duration bounds, and natural punctuation boundaries.
 */
export function groupWordsIntoCards(
  transcript: WhisperTranscript,
  options: ChunkOptions = {}
): CaptionCard[] {
  const maxWords = options.maxWordsPerCard ?? 5;
  const maxDuration = options.maxCardDuration ?? 2.2;
  const cards: CaptionCard[] = [];

  let currentCard: WhisperWord[] = [];
  const ENDING_PUNCTUATION = ['.', '!', '?', ';', ':', ','];

  for (const segment of transcript) {
    for (const w of segment.words) {
      currentCard.push(w);

      const cardDuration = currentCard[currentCard.length - 1].end - currentCard[0].start;
      const endsWithPunct = ENDING_PUNCTUATION.some((p) => w.word.trim().endsWith(p));

      if (currentCard.length >= maxWords || cardDuration >= maxDuration || endsWithPunct) {
        cards.push({
          start: currentCard[0].start,
          end: currentCard[currentCard.length - 1].end,
          words: [...currentCard],
        });
        currentCard = [];
      }
    }
  }

  if (currentCard.length > 0) {
    cards.push({
      start: currentCard[0].start,
      end: currentCard[currentCard.length - 1].end,
      words: currentCard,
    });
  }

  return cards;
}

export type CaptionPreset = 'spotlight' | 'hormozi' | 'cascade' | 'dynamicIsland';

/**
 * Converts a Whisper transcript into an array of kinetic GroupLayers.
 */
export function createKineticCaptionLayers(
  transcript: WhisperTranscript,
  preset: CaptionPreset = 'spotlight'
): GroupLayer[] {
  const cards = groupWordsIntoCards(transcript);
  const groupLayers: GroupLayer[] = [];

  cards.forEach((card, cardIdx) => {
    const chunks: ChunkLayer[] = card.words.map((word, wordIdx) => {
      const wordRelStart = Math.max(0, word.start - card.start);
      const wordDuration = Math.max(0.12, word.end - word.start);

      let animConfig: any;

      switch (preset) {
        case 'hormozi':
          animConfig = {
            preset: 'pop',
            start: wordRelStart,
            duration: 0.3,
            easing: 'bouncy',
          };
          break;

        case 'cascade':
          animConfig = {
            preset: 'slideUp',
            start: wordRelStart,
            duration: 0.28,
            easing: 'snappy',
            params: { distance: 20 },
          };
          break;

        case 'dynamicIsland':
          animConfig = {
            preset: 'scaleReveal',
            start: wordRelStart,
            duration: 0.25,
            easing: 'snappy',
          };
          break;

        case 'spotlight':
        default:
          animConfig = {
            preset: 'grow',
            start: wordRelStart,
            duration: wordDuration,
            easing: 'smooth',
          };
          break;
      }

      return {
        id: `caption_word_${cardIdx}_${wordIdx}`,
        name: word.word,
        type: 'chunk',
        content: word.word,
        style: {
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          rotation: 0,
          opacity: preset === 'spotlight' ? 0.4 : 1.0,
          fontSize: 52,
          fontWeight: preset === 'hormozi' ? '900' : '700',
          fontFamily: 'Inter',
          color: preset === 'hormozi' && wordIdx % 2 === 1 ? '#FACC15' : '#FFFFFF',
          lineHeight: 1.2,
        },
        animation: {
          in: animConfig,
        },
      };
    });

    const isPill = preset === 'dynamicIsland';

    const groupLayer: GroupLayer = {
      id: `caption_card_${cardIdx}`,
      name: `Caption Card ${cardIdx + 1}`,
      type: 'group',
      layout: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        align: 'center',
        justify: 'center',
      },
      autoFit: true,
      autoLink: false,
      style: {
        x: 960,
        y: 880,
        width: 1080,
        height: 'auto',
        pivotX: 0.5,
        pivotY: 0.5,
        rotation: 0,
        opacity: 1.0,
        padding: isPill ? [12, 28, 12, 28] : 16,
        backgroundColor: isPill ? 'rgba(0,0,0,0.75)' : 'transparent',
        borderRadius: isPill ? 32 : 12,
      },
      children: chunks,
      animation: {
        in: {
          preset: 'fadeIn',
          start: card.start,
          duration: 0.15,
          easing: 'linear',
        },
        out: {
          preset: 'fadeOut',
          start: card.end,
          duration: 0.15,
          easing: 'linear',
        },
      },
    };

    groupLayers.push(groupLayer);
  });

  return groupLayers;
}
