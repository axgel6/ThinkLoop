import sys

with open("cleaned.patch", "r", encoding="utf-8", errors="replace") as f:
    lines = f.readlines()

# Very naive patching algorithm tailored for this exact situation...
old_file = []
with open("client/src/components/Home.css", "r") as f:
    old_file = f.readlines()

# Wait, if `old_file` has changed after I checked out, I should run `git checkout HEAD:client/src/components/Home.css` BEFORE I apply the patch!
# Let me just dump the `cleaned.patch` and I'll use it to reconstruct.
