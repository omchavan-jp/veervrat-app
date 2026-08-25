<#
    Emergency cost stop for Veervrat (#93).

    Invoked by the monthly budget's action group when spend crosses the threshold. This is the
    "hard stop" the budget alerts were never able to be: an alert notifies, this halts the meter.

    What it stops, in order of how much they cost:

      1. Container Apps  — scaled to zero replicas. Prod runs min_replicas = 1 deliberately
                           (#92, so the first tester does not wait 20 seconds), which means it
                           bills continuously; zero is what actually stops that.
      2. Postgres        — Flexible Server supports a real stop. It is the largest fixed cost.

    What it CANNOT stop, and why that is stated rather than hidden:

      • Azure Managed Redis has no stop operation. Only deletion frees it, and deleting a cache
        holds live sessions, so this runbook does not. Redis therefore keeps billing after a
        stop, and the remaining burn is not zero.
      • Storage, ACR and Log Analytics keep their (small) at-rest cost.

    Deliberately NOT deleting anything. A stop is reversible in minutes; a delete is a restore.
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
            Update-AzContainerApp -ResourceGroupName $rg -Name $app.Name `
                -ScaleMinReplica 0 -ScaleMaxReplica 0 -ErrorAction Stop | Out-Null
            Write-Output "  stopped container app: $($app.Name)"
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
