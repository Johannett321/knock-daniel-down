import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Panel, PanelDivider } from '../components/Panel';
import { ScreenHeader } from '../components/ScreenHeader';
import { playSound } from '../game/audio';
import { POWER_UP_COST } from '../game/constants';
import { FACE_CATALOGUE, type FaceSkin } from '../game/faces';
import { IMAGES } from '../game/images';
import {
  getDiamonds,
  getFartStock,
  getNoBombsStock,
  getUnlockedFaces,
  setDiamonds,
  setFartStock,
  setNoBombsStock,
  setUnlockedFaces,
} from '../game/storage';

type Props = { onBack: () => void };

/**
 * The store: where diamonds are spent.
 *
 * It is deliberately only reachable from the menu. Power-ups are stock the
 * player steps out of a run to buy, which is the whole reason they are an
 * inventory now — shopping mid-run would just be the old mid-run purchase
 * with more steps.
 *
 * Nothing here can be bought with money. Diamonds come from diamond faces and
 * from nowhere else, and that is not a detail to be talked out of: the 2017
 * build sold them, and removing that was the point of open-sourcing this.
 */
export function StoreScreen({ onBack }: Props) {
  const [diamonds, setDiamondsState] = useState(0);
  const [fartStock, setFartStockState] = useState(0);
  const [noBombsStock, setNoBombsStockState] = useState(0);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  /** What was just bought, so the card can say so. */
  const [justBought, setJustBought] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [gems, fart, noBombs, faces] = await Promise.all([
        getDiamonds(),
        getFartStock(),
        getNoBombsStock(),
        getUnlockedFaces(),
      ]);
      if (cancelled) return;
      setDiamondsState(gems);
      setFartStockState(fart);
      setNoBombsStockState(noBombs);
      setUnlocked(faces);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Spend, or do nothing at all. Never lets the balance go negative. */
  const spend = useCallback(
    (price: number): boolean => {
      if (diamonds < price) return false;
      const left = diamonds - price;
      setDiamondsState(left);
      void setDiamonds(left);
      return true;
    },
    [diamonds],
  );

  const buyFart = () => {
    if (!spend(POWER_UP_COST)) return;
    const next = fartStock + 1;
    setFartStockState(next);
    void setFartStock(next);
    setJustBought('fart');
  };

  const buyNoBombs = () => {
    if (!spend(POWER_UP_COST)) return;
    const next = noBombsStock + 1;
    setNoBombsStockState(next);
    void setNoBombsStock(next);
    setJustBought('noBombs');
  };

  const buyFace = (face: FaceSkin) => {
    if (unlocked.includes(face.id)) return;
    if (!spend(face.price)) return;
    const next = [...unlocked, face.id];
    setUnlocked(next);
    void setUnlockedFaces(next);
    setJustBought(face.id);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Store" onBack={onBack} />

      <View style={styles.balance}>
        <Image source={IMAGES.diamond} resizeMode="contain" style={styles.balanceIcon} />
        <Text style={styles.balanceCount}>{diamonds}</Text>
        <Text style={styles.balanceLabel}>diamonds</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Panel title="Power-ups">
          <StockRow
            icon={IMAGES.powerUpFart}
            name="Fart"
            blurb="Clears faces at mid-screen for ten seconds."
            owned={fartStock}
            price={POWER_UP_COST}
            affordable={diamonds >= POWER_UP_COST}
            bought={justBought === 'fart'}
            onBuy={buyFart}
          />
          <PanelDivider />
          <StockRow
            icon={IMAGES.powerUpNoBombs}
            name="No bombs"
            blurb="Stops bombs spawning for ten seconds."
            owned={noBombsStock}
            price={POWER_UP_COST}
            affordable={diamonds >= POWER_UP_COST}
            bought={justBought === 'noBombs'}
            onBuy={buyNoBombs}
          />
        </Panel>
        <Text style={styles.note}>
          Stock up here — power-ups cannot be bought once a run has started.
        </Text>

        <Panel title="Daniels">
          {FACE_CATALOGUE.map((face, index) => (
            <View key={face.id}>
              {index > 0 && <PanelDivider />}
              <FaceRow
                face={face}
                owned={unlocked.includes(face.id)}
                affordable={diamonds >= face.price}
                bought={justBought === face.id}
                onBuy={() => buyFace(face)}
              />
            </View>
          ))}
        </Panel>
        <Text style={styles.note}>More heads to come. Diamond ones pay for them.</Text>

        <Text style={styles.footnote}>
          {ready
            ? 'Diamonds are earned by knocking down diamond faces. There is nothing to buy with real money, and never will be.'
            : ' '}
        </Text>
      </ScrollView>
    </View>
  );
}

/** A power-up: how many are held, and a button to add one more. */
function StockRow({
  icon,
  name,
  blurb,
  owned,
  price,
  affordable,
  bought,
  onBuy,
}: {
  icon: number;
  name: string;
  blurb: string;
  owned: number;
  price: number;
  affordable: boolean;
  bought: boolean;
  onBuy: () => void;
}) {
  return (
    <View style={styles.row}>
      <Image source={icon} resizeMode="contain" style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowBlurb}>{blurb}</Text>
        <Text style={styles.rowOwned}>
          {bought ? 'Added — ' : ''}
          {owned} in stock
        </Text>
      </View>
      <BuyButton label={`${price}`} enabled={affordable} onPress={onBuy} accessibilityLabel={`Buy ${name}`} />
    </View>
  );
}

/** A head: owned, or buyable for diamonds. */
function FaceRow({
  face,
  owned,
  affordable,
  bought,
  onBuy,
}: {
  face: FaceSkin;
  owned: boolean;
  affordable: boolean;
  bought: boolean;
  onBuy: () => void;
}) {
  return (
    <View style={styles.row}>
      <Image source={face.image} resizeMode="contain" style={styles.faceIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{face.name}</Text>
        <Text style={styles.rowBlurb}>{face.blurb}</Text>
        {owned && <Text style={styles.rowOwned}>{bought ? 'Unlocked' : 'Owned'}</Text>}
      </View>
      {owned ? (
        <Text style={styles.ownedTick} accessibilityLabel={`${face.name}, owned`}>
          ✓
        </Text>
      ) : (
        <BuyButton
          label={`${face.price}`}
          enabled={affordable}
          onPress={onBuy}
          accessibilityLabel={`Unlock ${face.name}`}
        />
      )}
    </View>
  );
}

function BuyButton({
  label,
  enabled,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  enabled: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  /** Web only: nothing hovers on a touchscreen. */
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPressIn={() => playSound('button')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.buy,
        !enabled && styles.buyDisabled,
        enabled && hovered && !pressed && styles.buyHovered,
        pressed && styles.buyPressed,
      ]}
    >
      <Image source={IMAGES.diamond} resizeMode="contain" style={styles.buyIcon} />
      <Text style={styles.buyLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#12100e',
  },
  balance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 18,
    paddingBottom: 4,
  },
  balanceIcon: {
    width: 26,
    height: 26,
  },
  balanceCount: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
  },
  balanceLabel: {
    color: '#9b948c',
    fontSize: 15,
    marginTop: 6,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  rowIcon: {
    width: 44,
    height: 44,
  },
  faceIcon: {
    width: 48,
    height: 48,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  rowBlurb: {
    color: '#9b948c',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  rowOwned: {
    color: '#ffb74d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  ownedTick: {
    color: '#81c784',
    fontSize: 22,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  buy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffb74d',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    cursor: 'pointer',
  },
  buyDisabled: {
    opacity: 0.35,
  },
  buyHovered: {
    backgroundColor: '#ffca6a',
    transform: [{ scale: 1.06 }],
  },
  buyPressed: {
    transform: [{ scale: 0.94 }],
  },
  buyIcon: {
    width: 14,
    height: 14,
  },
  buyLabel: {
    color: '#3b2a12',
    fontSize: 15,
    fontWeight: '800',
  },
  note: {
    color: '#9b948c',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  footnote: {
    color: '#6f6a64',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 4,
  },
});
