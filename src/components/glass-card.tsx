/**
 * Kept as an alias so the fourteen screens importing `GlassCard` keep working.
 *
 * The card stopped being glass when the app moved to a light, opaque, shadow-
 * based surface language — the name now describes a material that is no longer
 * there. New code should import {@link Card} directly; this re-export exists so
 * that renaming twenty imports did not have to be part of the reskin.
 */
export { Card, Card as GlassCard, type CardTone } from '@/components/card';
