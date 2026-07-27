import { useMemo, useState } from 'react';
import { Armchair, BadgeCheck, Crown, Dumbbell, Gem, Lock, Shirt, ShoppingBag, Sparkles, Swords, Zap } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import StatBadge from '../components/ui/StatBadge.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { supabase } from '../lib/supabase.js';

const INVENTORY_KEY = 'shadowAscentInventory';
const EQUIPPED_KEY = 'shadowAscentEquippedItems';

const SHOP_ITEMS = [
  { id: 'hood-initiate', name: 'Initiate Hood', category: 'cosmetic', slot: 'head', price: 60, icon: Shirt, rarity: 'common', bonus: '+1 focus aura' },
  { id: 'cloak-violet', name: 'Violet Nightcloak', category: 'cosmetic', slot: 'back', price: 120, icon: Shirt, rarity: 'rare', bonus: '+2 discipline presence' },
  { id: 'gauntlets-iron', name: 'Iron Grip Gauntlets', category: 'equipment', slot: 'hands', price: 150, icon: Dumbbell, rarity: 'rare', bonus: '+3 strength style' },
  { id: 'boots-sprinter', name: 'Sprinter Boots', category: 'equipment', slot: 'feet', price: 140, icon: Zap, rarity: 'rare', bonus: '+3 movement style' },
  { id: 'band-focus', name: 'Focus Band', category: 'equipment', slot: 'accessory', price: 90, icon: Sparkles, rarity: 'common', bonus: '+2 mind style' },
  { id: 'blade-shadow', name: 'Shadow Training Blade', category: 'equipment', slot: 'weapon', price: 220, icon: Swords, rarity: 'epic', bonus: '+5 quest presence' },
  { id: 'ring-gold', name: 'Gold Rank Ring', category: 'cosmetic', slot: 'accessory', price: 260, icon: Gem, rarity: 'epic', bonus: '+5 gold aura' },
  { id: 'crown-ascent', name: 'Ascent Crown', category: 'cosmetic', slot: 'head', price: 500, icon: Crown, rarity: 'legendary', bonus: '+10 profile prestige' },
  { id: 'mat-recovery', name: 'Recovery Mat', category: 'training', slot: 'tool', price: 80, icon: Armchair, rarity: 'common', bonus: '+2 recovery style' },
  { id: 'rope-cardio', name: 'Cardio Rope', category: 'training', slot: 'tool', price: 110, icon: Zap, rarity: 'common', bonus: '+2 conditioning style' },
  { id: 'bells-dual', name: 'Dual Iron Bells', category: 'training', slot: 'tool', price: 240, icon: Dumbbell, rarity: 'epic', bonus: '+5 workout presence' },
  { id: 'sigil-mind', name: 'Mind Sigil', category: 'cosmetic', slot: 'badge', price: 130, icon: Sparkles, rarity: 'rare', bonus: '+3 brain quest aura' },
  { id: 'badge-streak', name: 'Streak Badge', category: 'cosmetic', slot: 'badge', price: 170, icon: BadgeCheck, rarity: 'rare', bonus: '+4 habit prestige' },
  { id: 'armor-platinum', name: 'Platinum Training Armor', category: 'cosmetic', slot: 'body', price: 360, icon: ShieldIcon, rarity: 'legendary', bonus: '+8 visual defense' },
  { id: 'core-crystal', name: 'Ascendant Core Crystal', category: 'relic', slot: 'relic', price: 700, icon: Gem, rarity: 'legendary', bonus: '+15 ascension aura' },
];

function ShieldIcon(props) {
  return <Lock {...props} />;
}

function readJSON(key, fallback) {
  try {
    const storedValue = globalThis?.localStorage?.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    globalThis?.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function emitEvent(eventName, detail) {
  try {
    globalThis?.dispatchEvent?.(new CustomEvent(eventName, { detail }));
  } catch {
    return false;
  }

  return true;
}

function syncInventory(user, inventory, equipped) {
  if (!user?.id || !supabase) {
    return;
  }

  try {
    supabase
      .from('player_inventory')
      .upsert({ user_id: user?.id, inventory, equipped, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .then(() => undefined)
      .catch(() => undefined);
  } catch {
    return;
  }
}

export default function Shop() {
  const { user, profile, loading, error, updateProfile } = useAuth();
  const toast = useToast();
  const [inventory, setInventory] = useState(() => {
    const storedInventory = readJSON(INVENTORY_KEY, []);
    return Array.isArray(storedInventory) ? storedInventory : [];
  });
  const [equipped, setEquipped] = useState(() => {
    const storedEquipped = readJSON(EQUIPPED_KEY, {});
    return storedEquipped && typeof storedEquipped === 'object' ? storedEquipped : {};
  });
  const [category, setCategory] = useState('all');
  const [localError, setLocalError] = useState('');
  const gold = Number(profile?.gold || 0);
  const filteredItems = useMemo(
    () => (category === 'all' ? SHOP_ITEMS : SHOP_ITEMS.filter((item) => item?.category === category)),
    [category],
  );
  const categories = ['all', ...new Set(SHOP_ITEMS.map((item) => item?.category))];

  function buyItem(item) {
    if (inventory?.includes(item?.id)) {
      toast?.warning?.('Item already owned.');
      return;
    }

    if (gold < item?.price) {
      setLocalError('Not enough gold for that item.');
      return;
    }

    const nextInventory = [item?.id, ...inventory];
    const inventorySaved = writeJSON(INVENTORY_KEY, nextInventory);

    if (!inventorySaved) {
      setLocalError('Inventory could not be saved locally.');
      return;
    }

    setInventory(nextInventory);
    const nextProfile = updateProfile?.({ gold: gold - item?.price });
    emitEvent('goldUpdated', { amount: -item?.price, source: 'shopPurchase', totalGold: nextProfile?.gold });
    syncInventory(user, nextInventory, equipped);
    setLocalError('');
    toast?.success?.(`${item?.name} purchased.`);
  }

  function equipItem(item) {
    if (!inventory?.includes(item?.id)) {
      setLocalError('Purchase this item before equipping it.');
      return;
    }

    const nextEquipped = {
      ...equipped,
      [item?.slot]: item?.id,
    };
    const saved = writeJSON(EQUIPPED_KEY, nextEquipped);

    if (!saved) {
      setLocalError('Equipment could not be saved locally.');
      return;
    }

    setEquipped(nextEquipped);
    emitEvent('statUpdated', { type: 'equipment', equipped: nextEquipped });
    syncInventory(user, inventory, nextEquipped);
    setLocalError('');
    toast?.success?.(`${item?.name} equipped.`);
  }

  return (
    <div className="w-full space-y-6">
      <Card error={error} loading={loading} subtitle="Buy and equip visual RPG items with earned gold." title="Shop" icon={ShoppingBag}>
        {localError ? <div className="mb-5 rounded-2xl border border-shadow-red/30 bg-shadow-red/10 p-4 text-sm text-shadow-textSecondary">{localError}</div> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatBadge icon={Gem} label="Gold" value={gold} />
          <StatBadge icon={ShoppingBag} label="Owned" tone="purple" value={`${inventory?.length}/15`} />
          <StatBadge icon={Crown} label="Equipped" value={Object.keys(equipped || {})?.length} />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {categories?.map((entry) => (
            <button
              className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize transition ${
                category === entry ? 'border-shadow-gold/40 bg-shadow-gold/15 text-shadow-gold' : 'border-white/10 bg-white/[0.03] text-shadow-textSecondary hover:border-shadow-purple/40'
              }`}
              key={entry}
              onClick={() => setCategory(entry)}
              type="button"
            >
              {entry}
            </button>
          ))}
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems?.map((item) => {
          const Icon = item?.icon || ShoppingBag;
          const owned = inventory?.includes(item?.id);
          const equippedInSlot = equipped?.[item?.slot] === item?.id;

          return (
            <article className={`glass-card p-5 transition ${equippedInSlot ? 'border-shadow-green/30 shadow-goldGlow' : 'hover:border-shadow-gold/30'}`} key={item?.id}>
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-shadow-purple/30 bg-shadow-purple/10 text-shadow-purpleLight">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-shadow-gold/30 bg-shadow-gold/10 px-3 py-1 text-xs font-semibold capitalize text-shadow-gold">{item?.rarity}</span>
              </div>
              <h2 className="mt-4 font-heading text-xl font-bold text-shadow-gold">{item?.name}</h2>
              <p className="mt-2 text-sm text-shadow-textSecondary">{item?.bonus}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-shadow-purpleLight">
                {item?.category} / {item?.slot}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button disabled={owned} onClick={() => buyItem(item)} variant={owned ? 'ghost' : 'primary'}>
                  {owned ? 'Owned' : `${item?.price} Gold`}
                </Button>
                <Button disabled={!owned || equippedInSlot} onClick={() => equipItem(item)} variant="secondary">
                  {equippedInSlot ? 'Equipped' : 'Equip'}
                </Button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
