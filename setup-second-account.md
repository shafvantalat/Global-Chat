# Push to Second GitHub Account (shafvantalat)

## Option 1: Use Personal Access Token (Recommended)

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` permissions
3. Copy the token
4. Run:
```bash
git remote set-url upstream https://YOUR_TOKEN@github.com/shafvantalat/Global-Chat.git
git push upstream shafvan-via-srf
```

## Option 2: Use SSH (Better for multiple accounts)

1. Generate new SSH key for second account:
```bash
ssh-keygen -t ed25519 -C "shafvantalat@gmail.com" -f ~/.ssh/id_ed25519_shafvan
```

2. Add to SSH agent:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_shafvan
```

3. Copy public key and add to GitHub:
```bash
cat ~/.ssh/id_ed25519_shafvan.pub
```
   Go to GitHub → Settings → SSH Keys → Add new

4. Update remote to use SSH:
```bash
git remote set-url upstream git@github.com:shafvantalat/Global-Chat.git
```

5. Create SSH config (~/.ssh/config):
```
Host github.com-shafvan
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_shafvan
```

6. Update remote with custom host:
```bash
git remote set-url upstream git@github.com-shafvan:shafvantalat/Global-Chat.git
```

## Quick Push Command

After setup, just run:
```bash
git push upstream shafvan-via-srf
```

## Current Remotes:
- origin: shereifsrf/Global-Chat
- upstream: shafvantalat/Global-Chat
