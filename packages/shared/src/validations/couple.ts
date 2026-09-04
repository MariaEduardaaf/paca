import { z } from "zod";
import {
  INVITE_CODE_PREFIX,
  INVITE_CODE_MIN_LENGTH,
  INVITE_CODE_MAX_LENGTH,
} from "../constants/categories";

const codePattern = new RegExp(
  `^${INVITE_CODE_PREFIX}-[A-HJ-NP-Z2-9]{${INVITE_CODE_MIN_LENGTH},${INVITE_CODE_MAX_LENGTH}}$`
);

export const joinCoupleSchema = z.object({
  invite_code: z
    .string()
    .transform((v) => v.toUpperCase().trim())
    .pipe(z.string().regex(codePattern, "Código de convite inválido")),
});

export type JoinCoupleInput = z.infer<typeof joinCoupleSchema>;
