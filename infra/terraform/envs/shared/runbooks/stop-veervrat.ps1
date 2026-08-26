<#
    Emergency cost stop for Veervrat (#93).

    Invoked by the monthly budget's action group when spend crosses the threshold. This is the
    "hard stop" the budget alerts were never able to be: an alert notifies, this halts the meter.

    What it stops, in order of how much they cost:

      1. Container Apps  — the active revision is DEACTIVATED. Prod runs min_replicas = 1
                           deliberately (#92, so the first tester does not wait 20 seconds),
                           which means it bills continuously.

                           ⚠️ Scaling to 0/0 was the obvious approach and Azure refuses it:
                           "maxReplicas must be greater than 0". Found on 2026-08-26 by running
                           this runbook against UAT for real — every earlier check had proved
                           the identity, the cmdlets and the permissions, none of which is the
                           same as the operation working. Setting only minReplicas to 0 is not a
                           stop either: traffic simply starts a replica again.
      2. Postgres        — Flexible Server supports a real stop. It is the largest fixed cost.

    What it CANNOT stop, and why that is stated rather than hidden:

      • Azure Managed Redis has no stop operation. Only deletion frees it, and deleting a cache
        holds live sessions, so this runbook does not. Redis therefore keeps billing after a
        stop, and the remaining burn is not zero.
      • Storage, ACR and Log Analytics keep their (small) at-rest cost.

    Deliberately NOT deleting anything. A stop is reversible in minutes; a delete is a restore.

    VERIFIED 2026-08-25, without stopping anything, via a disposable self-test runbook in this
    same PowerShell 7.2 runtime:

      • the managed identity authenticates                                    (IDENTITY: ok)
      • every cmdlet below exists in this runtime                             (4/4 present)
      • the custom role permits reading container apps and Postgres           (2 apps, 1 server)
      • the custom role permits WRITING a container app — probed against a name that does not
        exist, so the failure was ResourceNotFound rather than AuthorizationFailed, which is
        what distinguishes "allowed" from "denied" without changing a resource

    PROVEN END TO END on 2026-08-26, by running this against veervrat-uat for real and then
    restoring it:

      stopped container app: veervrat-uat-api (revision veervrat-uat-api--0000088)
      stopped container app: veervrat-uat-web (revision veervrat-uat-web--0000065)
      stopped postgres: veervrat-uat-psql

    Confirmed afterwards against Azure rather than from the output: zero active revisions on both
    apps, Postgres 'Stopped', and both public endpoints returning 404. Restored by reactivating
    each revision and starting the server.

    That run is also what found the defect. The first version scaled to 0/0 and Azure refused it
    — so the earlier "verification", which proved the identity, the cmdlets and both RBAC
    permissions, had confirmed authorisation while the operation itself did not work. A stop that
    halts the database and leaves the compute billing reads exactly like a stop that worked.
#>
param(
    [string[]] $ResourceGroups = @('veervrat-uat', 'veervrat-prod')
)

$ErrorActionPreference = 'Continue'   # one failure must not prevent the remaining stops
Connect-AzAccount -Identity | Out-Null

foreach ($rg in $ResourceGroups) {
    Write-Output "=== $rg ==="

    foreach ($app in (Get-AzContainerApp -ResourceGroupName $rg -ErrorAction SilentlyContinue)) {
        try {
            # Deactivating every ACTIVE revision is what actually stops the app. Reversible with
            # `Enable-AzContainerAppRevision`, deliberately left as a human action.
            $revisions = Get-AzContainerAppRevision -ResourceGroupName $rg -ContainerAppName $app.Name -ErrorAction Stop |
                         Where-Object { $_.Active }
            if (-not $revisions) {
                Write-Output "  container app already stopped: $($app.Name)"
                continue
            }
            foreach ($rev in $revisions) {
                Disable-AzContainerAppRevision -ResourceGroupName $rg -ContainerAppName $app.Name `
                    -Name $rev.Name -ErrorAction Stop | Out-Null
                Write-Output "  stopped container app: $($app.Name) (revision $($rev.Name))"
            }
        } catch {
            Write-Output "  FAILED container app $($app.Name): $($_.Exception.Message)"
        }
    }

    foreach ($pg in (Get-AzPostgreSqlFlexibleServer -ResourceGroupName $rg -ErrorAction SilentlyContinue)) {
        try {
            Stop-AzPostgreSqlFlexibleServer -ResourceGroupName $rg -Name $pg.Name -ErrorAction Stop | Out-Null
            Write-Output "  stopped postgres: $($pg.Name)"
        } catch {
            Write-Output "  FAILED postgres $($pg.Name): $($_.Exception.Message)"
        }
    }
}

Write-Output "Done. Redis is still billing — it has no stop operation (see this runbook's header)."
