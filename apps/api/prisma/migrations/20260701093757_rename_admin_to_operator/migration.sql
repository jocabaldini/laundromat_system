-- Rename enum value ADMIN to OPERATOR
-- Using CREATE/ALTER approach compatible with transaction mode

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE text;

DROP TYPE "Role";

CREATE TYPE "Role" AS ENUM ('OPERATOR', 'USER');

ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';