-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_weakness_id_fkey" FOREIGN KEY ("weakness_id") REFERENCES "weaknesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
