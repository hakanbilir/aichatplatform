import os
import re

files_to_update = []
for root, dirs, files in os.walk('apps/web/src'):
    for file in files:
        if file.endswith('.tsx'):
            files_to_update.append(os.path.join(root, file))

modified = 0
for file_path in files_to_update:
    with open(file_path, 'r') as f:
        content = f.read()

    new_content = ""
    i = 0
    changed = False

    while i < len(content):
        # Find "<Button"
        if content[i:].startswith('<Button') and (i + 7 == len(content) or content[i+7].isspace() or content[i+7] == '>'):
            start_idx = i
            # Find the closing >
            brace_count = 0
            j = i + 7
            while j < len(content):
                if content[j] == '{':
                    brace_count += 1
                elif content[j] == '}':
                    brace_count -= 1
                elif content[j] == '>' and brace_count == 0:
                    break
                j += 1

            if j < len(content):
                tag_content = content[start_idx:j+1]

                # Check if it's already got data-ai-action
                if 'data-ai-action' not in tag_content:
                    action_name = "button-action"

                    # Extract onClick
                    onclick_match = re.search(r'onClick=\{([^}]+)\}', tag_content)
                    if onclick_match:
                        # Clean up
                        func_str = onclick_match.group(1)
                        # e.g. handleRun or () => onRetry()
                        # Extract the first word-like thing
                        words = re.findall(r'[A-Za-z0-9_]+', func_str)
                        for word in words:
                            if word not in ['e', 'event', 'console', 'log', 'set', 'true', 'false']:
                                action_name = word.replace('handle', '').lower()
                                break

                    elif 'type="submit"' in tag_content:
                        action_name = "submit"

                    if len(action_name) < 3:
                        action_name = "button-action"

                    # Replace the closing bracket
                    if tag_content.endswith('/>'):
                        tag_content = tag_content[:-2] + f' data-ai-action="{action_name}" />'
                    else:
                        tag_content = tag_content[:-1] + f' data-ai-action="{action_name}">'

                    new_content += tag_content
                    i = j + 1
                    changed = True
                    continue

        new_content += content[i]
        i += 1

    if changed and new_content != content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        modified += 1

print(f"Done modifying {modified} files")
