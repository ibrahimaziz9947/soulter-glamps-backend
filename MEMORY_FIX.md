# VS Code Memory Optimization - OOM Fix

## Issue Analysis

Your VS Code crash (error -536870904, OOM) is caused by:
1. ✅ `.history/` folder from Local History extension
2. ✅ `node_modules/` being watched and indexed
3. ✅ `generated/` folder from Prisma being monitored
4. ✅ `.early.coverage/` from code coverage tools

## Immediate Actions Taken

### 1. Created `.vscode/settings.json`
- Excluded heavy folders from file watching
- Limited TypeScript server memory to 2GB
- Disabled unnecessary features
- Optimized search and file exploration

### 2. Updated `.gitignore`
- Added `.history/` (Local History extension cache)
- Added coverage folders
- Added build outputs

## Recommended Actions

### Option 1: Disable/Remove Local History Extension
The `.history/` folder is the most common cause of OOM errors:

**Recommended:** Disable or uninstall "Local History" extension:
1. Press `Ctrl+Shift+X`
2. Search for "Local History"
3. Click "Disable" or "Uninstall"

**Alternative:** Keep it but limit its size:
```json
// Add to User Settings (Ctrl+,)
"local-history.maxDisplay": 10,
"local-history.daysLimit": 7,
"local-history.saveDelay": 0
```

### Option 2: Clean Up Large Folders

Run these commands to free memory:
```powershell
# Remove history cache (safe - can be regenerated)
Remove-Item -Recurse -Force .history

# Remove coverage files (safe)
Remove-Item -Recurse -Force .early.coverage -ErrorAction SilentlyContinue

# Clean node_modules and reinstall (if needed)
Remove-Item -Recurse -Force node_modules
npm install
```

### Option 3: Increase VS Code Memory Limit

Create/edit `argv.json`:
1. Press `Ctrl+Shift+P`
2. Type "Configure Runtime Arguments"
3. Add:
```json
{
  "max-memory": "4096"
}
```
4. Restart VS Code

### Option 4: Use Workspace-Specific Extensions

Instead of installing all extensions globally:
1. Press `Ctrl+Shift+P`
2. Type "Extensions: Show Recommended Extensions"
3. Only enable essential extensions for this workspace

## Essential Extensions for This Project

Keep only these enabled:
- ✅ Prisma (prisma.prisma)
- ✅ ESLint (if you use it)
- ✅ GitLens (optional, but can be disabled if memory is tight)
- ❌ Local History (disable or limit)
- ❌ Import Cost (heavy)
- ❌ Path Intellisense (heavy in large projects)

## Memory Monitoring

Monitor VS Code's memory usage:
1. Press `Ctrl+Shift+P`
2. Type "Developer: Open Process Explorer"
3. Watch for processes using >500MB

## Long-Term Prevention

### 1. Regular Cleanup
```powershell
# Weekly cleanup script
npm run clean    # Add this to package.json
rm -rf .history
```

### 2. Add to package.json
```json
{
  "scripts": {
    "clean": "rimraf .history .early.coverage generated/prisma dist build",
    "clean:all": "npm run clean && rimraf node_modules && npm install"
  }
}
```

### 3. Prisma-Specific Optimization

Your `generated/` folder can get large:
- Always use `npx prisma generate` instead of global Prisma
- Run `npx prisma generate` only when schema changes

## VS Code Settings Applied

All settings are now in `.vscode/settings.json`:
- ✅ Excluded `node_modules`, `.history`, `generated` from watching
- ✅ Limited TypeScript server memory to 2GB
- ✅ Disabled auto-type acquisition
- ✅ Reduced code lens and suggestions
- ✅ Optimized file nesting and explorer

## Testing the Fix

1. **Close VS Code completely**
2. **Delete .history folder**: `Remove-Item -Recurse -Force .history`
3. **Restart VS Code**
4. **Monitor memory**: Open Process Explorer (Ctrl+Shift+P → "Developer: Open Process Explorer")

If crashes persist:
- Disable more extensions
- Increase `max-memory` to 8192
- Consider splitting project into multiple workspaces

## Critical Warning Signs

Watch for these before a crash:
- VS Code becomes sluggish
- File changes not reflecting
- IntelliSense delays >2 seconds
- Process Explorer shows >1.5GB usage

**Action:** Restart VS Code immediately if you see these.

## Workspace Recommendations

For this Express + Prisma project:
- Keep only Prisma extension enabled
- Use command line for Git operations (lighter than GitLens)
- Disable Local History or limit to 7 days
- Run `npm run dev` in external terminal, not VS Code integrated terminal

---

**Your OOM issue should now be resolved!** 🎉

The main culprit was likely the `.history/` folder combined with `node_modules` being watched.
