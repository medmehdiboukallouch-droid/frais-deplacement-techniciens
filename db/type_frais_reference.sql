-- Référence : contrainte CHECK type_frais sur frais_deplacement
--
-- Pour afficher la définition ACTUELLE dans votre base :
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'frais_deplacement'::regclass AND contype = 'c';
--
-- L'application envoie (formulaire + API) ces valeurs en MINUSCULES :
--   transport | repas | materiel | hebergement | autre
--
-- Si la contrainte attend d'autres valeurs (ex. MAJUSCULES ou libellés "Transport"),
-- exécutez db/fix_type_frais.sql puis recréez la contrainte ci-dessous :

ALTER TABLE frais_deplacement
  DROP CONSTRAINT IF EXISTS frais_deplacement_type_frais_check;

ALTER TABLE frais_deplacement
  ADD CONSTRAINT frais_deplacement_type_frais_check
  CHECK (type_frais IN ('transport', 'repas', 'materiel', 'hebergement', 'autre'));
