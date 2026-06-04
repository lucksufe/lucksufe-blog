#!/bin/bash
# Usage: ./new-post.sh posts/my-post.md
# Parses YAML frontmatter from a .md file and appends to js/posts.js

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <markdown-file>"
  exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
  echo "Error: File '$FILE' not found."
  exit 1
fi

# Parse frontmatter (between --- lines)
IN_FRONT=0
TITLE=""
DATE=""
TAGS=""
SUMMARY=""
BODY=""

while IFS= read -r line; do
  if [ "$line" = "---" ]; then
    IN_FRONT=$((IN_FRONT + 1))
    continue
  fi

  if [ $IN_FRONT -eq 1 ]; then
    # Parse frontmatter fields
    if [[ "$line" =~ ^title:\ *(.*) ]]; then
      TITLE="${BASH_REMATCH[1]}"
      # Remove surrounding quotes if present
      TITLE="${TITLE%\"}"
      TITLE="${TITLE#\"}"
      TITLE="${TITLE%\'}"
      TITLE="${TITLE#\'}"
    elif [[ "$line" =~ ^date:\ *(.*) ]]; then
      DATE="${BASH_REMATCH[1]}"
    elif [[ "$line" =~ ^tags:\ *\[(.*)\] ]]; then
      RAW_TAGS="${BASH_REMATCH[1]}"
      # Split by comma and wrap each in quotes
      TAGS=""
      IFS=',' read -ra TAG_ARR <<< "$RAW_TAGS"
      for t in "${TAG_ARR[@]}"; do
        t=$(echo "$t" | xargs)  # trim whitespace
        if [ -n "$TAGS" ]; then TAGS+=", "; fi
        TAGS+="\"$t\""
      done
    elif [[ "$line" =~ ^summary:\ *(.*) ]]; then
      SUMMARY="${BASH_REMATCH[1]}"
      SUMMARY="${SUMMARY%\"}"
      SUMMARY="${SUMMARY#\"}"
      SUMMARY="${SUMMARY%\'}"
      SUMMARY="${SUMMARY#\'}"
    fi
  elif [ $IN_FRONT -ge 2 ]; then
    BODY+="$line"$'\n'
  fi
done < "$FILE"

# Generate id from filename
ID=$(basename "$FILE" .md)

# Trim trailing newline from body
BODY="${BODY%$'\n'}"

# Escape backticks in content by using template literal safely
# We need to escape backslashes and backticks for JS template literal
BODY_ESCAPED=$(echo "$BODY" | sed 's/\\/\\\\/g; s/`/\\`/g; s/\$/\\$/g')

# Check if post id already exists
if grep -q "id: \"$ID\"" js/posts.js 2>/dev/null; then
  echo "Error: Post with id '$ID' already exists in js/posts.js"
  exit 1
fi

# Build the new post entry
POST_ENTRY="  {
    id: \"$ID\",
    title: \"$TITLE\",
    date: \"$DATE\",
    tags: [$TAGS],
    summary: \"$SUMMARY\",
    content: \`
${BODY_ESCAPED}\`
  }"

# Insert before the closing ];
# Use a temp file approach for portability
TMPFILE=$(mktemp)

# Read everything except the last ]; and append new post
head -n -1 js/posts.js > "$TMPFILE"
# Check if there are existing posts (need comma separator)
if grep -q "id:" "$TMPFILE"; then
  echo "," >> "$TMPFILE"
fi
echo "$POST_ENTRY" >> "$TMPFILE"
echo "];" >> "$TMPFILE"

mv "$TMPFILE" js/posts.js

echo "Done! Post '$TITLE' (id: $ID) added to js/posts.js"
echo "Refresh your browser to see it."
