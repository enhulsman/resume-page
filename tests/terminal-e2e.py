"""End-to-end tests for the interactive terminal upgrade."""
import sys
import time
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:4321"
TIMEOUT = 60000  # 60s for initial page load (Pi can be slow)

def get_terminal(page):
    """Navigate to home, wait for terminal animation to finish, return body element."""
    page.goto(BASE, wait_until="networkidle", timeout=TIMEOUT)
    # Scroll terminal into viewport via JS
    page.evaluate("document.getElementById('terminal-body').scrollIntoView()")
    time.sleep(2)
    # Wait for animation to complete — the input line appears when ready
    page.wait_for_selector(".terminal-input-line", timeout=TIMEOUT)
    return page.locator("#terminal-body")

def type_command(page, cmd):
    """Type a command and press Enter."""
    # Focus terminal
    page.click("#terminal-body")
    time.sleep(0.2)
    # Type into hidden input
    inp = page.locator("#terminal-input")
    inp.fill(cmd)
    inp.press("Enter")
    time.sleep(0.5)  # Wait for output

def get_all_output_text(page):
    """Get all output text joined."""
    lines = page.locator(".terminal-output-line")
    total = lines.count()
    results = []
    for i in range(total):
        results.append(lines.nth(i).inner_text())
    return results

def get_all_output_html(page):
    """Get all output HTML joined."""
    lines = page.locator(".terminal-output-line")
    total = lines.count()
    results = []
    for i in range(total):
        results.append(lines.nth(i).inner_html())
    return results

def get_output_after(page, before_count):
    """Get text of terminal-body children added since before_count (excluding input line and hidden input)."""
    return page.evaluate(f"""() => {{
        const body = document.getElementById('terminal-body');
        const children = Array.from(body.children).filter(c =>
            c.id !== 'terminal-input' && !c.classList.contains('terminal-input-line'));
        return children.slice({before_count}).map(c => c.innerText || c.textContent || '');
    }}""")

def get_output_html_after(page, before_count):
    """Get HTML of terminal-body children added since before_count."""
    return page.evaluate(f"""() => {{
        const body = document.getElementById('terminal-body');
        const children = Array.from(body.children).filter(c =>
            c.id !== 'terminal-input' && !c.classList.contains('terminal-input-line'));
        return children.slice({before_count}).map(c => c.innerHTML || '');
    }}""")

def count_output_lines(page):
    return page.evaluate("""() => {
        const body = document.getElementById('terminal-body');
        return Array.from(body.children).filter(c =>
            c.id !== 'terminal-input' && !c.classList.contains('terminal-input-line')).length;
    }""")

def run_tests():
    failures = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Waiting for terminal to load...")
        get_terminal(page)
        print("Terminal ready.")

        def run_cmd(cmd):
            """Run a command, return (new_text_lines, new_html_lines)."""
            before = count_output_lines(page)
            type_command(page, cmd)
            text = get_output_after(page, before)
            html = get_output_html_after(page, before)
            return text, html

        # Test: echo with variable expansion
        print("Test: echo $HOSTNAME")
        text, _ = run_cmd("echo $HOSTNAME")
        if not any("hulsman" in line.lower() for line in text):
            failures.append(f"echo $HOSTNAME: expected 'hulsman', got {text}")
        else:
            print("  PASS")

        # Test: ls shows VFS contents
        print("Test: ls")
        _, html = run_cmd("ls")
        combined = " ".join(html)
        if "projects/" not in combined:
            failures.append(f"ls: expected 'projects/', got {combined[:200]}")
        else:
            print("  PASS")

        # Test: cat resume shows HTML-formatted output
        print("Test: cat resume (rich output)")
        _, html = run_cmd("cat resume")
        combined = " ".join(html)
        if "terminal-accent" not in combined:
            failures.append(f"cat resume: expected HTML with terminal-accent, got {combined[:200]}")
        else:
            print("  PASS")

        # Test: pwd
        print("Test: pwd")
        text, _ = run_cmd("pwd")
        if not any("/home/ezra" in line for line in text):
            failures.append(f"pwd: expected '/home/ezra', got {text}")
        else:
            print("  PASS")

        # Test: cd projects && ls
        print("Test: cd projects && ls")
        text, html = run_cmd("cd projects && ls")
        combined_text = " ".join(text)
        combined_html = " ".join(html)
        if "projects" not in combined_text.lower() and "projects" not in combined_html.lower():
            failures.append(f"cd projects && ls: unexpected output {combined_text[:200]}")
        else:
            print("  PASS")

        # Test: pwd after cd shows ~/projects
        print("Test: pwd after cd")
        text, _ = run_cmd("pwd")
        if not any("/home/ezra/projects" in line for line in text):
            failures.append(f"pwd after cd: expected '/home/ezra/projects', got {text}")
        else:
            print("  PASS")

        # Test: cd ~ to go home
        run_cmd("cd ~")

        # Test: env shows variables
        print("Test: env")
        text, _ = run_cmd("env")
        combined = " ".join(text)
        if "USER=ezra" not in combined:
            failures.append(f"env: expected USER=ezra, got {combined[:200]}")
        else:
            print("  PASS")

        # Test: export and echo
        print("Test: export FOO=bar && echo $FOO")
        text, _ = run_cmd("export FOO=bar && echo $FOO")
        if not any("bar" in line for line in text):
            failures.append(f"export/echo: expected 'bar', got {text}")
        else:
            print("  PASS")

        # Test: touch in /tmp
        print("Test: touch /tmp/test && cat /tmp/test")
        text, _ = run_cmd("touch /tmp/test && cat /tmp/test")
        combined = " ".join(text)
        if "Permission denied" in combined or "No such file" in combined:
            failures.append(f"touch/cat /tmp: got error: {combined[:200]}")
        else:
            print("  PASS")

        # Test: touch outside /tmp fails
        print("Test: touch /home/ezra/nope (permission denied)")
        text, _ = run_cmd("touch /home/ezra/nope")
        if not any("Permission denied" in line for line in text):
            failures.append(f"touch permission: expected denied, got {text}")
        else:
            print("  PASS")

        # Test: help shows new sections
        print("Test: help")
        _, html = run_cmd("help")
        combined = " ".join(html)
        if "Environment" not in combined or "Files" not in combined:
            failures.append(f"help: missing new sections, got {combined[:300]}")
        else:
            print("  PASS")

        # Test: existing easter eggs still work
        print("Test: fortune")
        text, _ = run_cmd("fortune")
        if len(text) == 0 or all(line.strip() == "" for line in text):
            failures.append("fortune: no output")
        else:
            print("  PASS")

        # Test: whoami
        print("Test: whoami")
        text, _ = run_cmd("whoami")
        if not any("ezra" in line for line in text):
            failures.append(f"whoami: expected 'ezra', got {text}")
        else:
            print("  PASS")

        browser.close()

    print()
    if failures:
        print(f"FAILED ({len(failures)} failures):")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("ALL TESTS PASSED!")

if __name__ == "__main__":
    run_tests()
