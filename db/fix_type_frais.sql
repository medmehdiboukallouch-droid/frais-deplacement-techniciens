-- Suppression des contraintes CHECK obsolètes sur frais_deplacement.
-- Puis recréation alignée avec le frontend (src/constants/expenseTypes.ts).
--
-- Problème corrigé côté serveur : ne plus envoyer TRANSPORT en MAJUSCULES à l'INSERT.

ALTER TABLE frais_deplacement
  DROP CONSTRAINT IF EXISTS frais_deplacement_type_frais_check;

ALTER TABLE frais_deplacement
  DROP CONSTRAINT IF EXISTS frais_deplacement_statut_validation_check;

ALTER TABLE validations
  DROP CONSTRAINT IF EXISTS validations_decision_check;

ALTER TABLE frais_deplacement
  ADD CONSTRAINT frais_deplacement_type_frais_check
  CHECK (type_frais IN ('transport', 'repas', 'materiel', 'hebergement', 'autre'));
