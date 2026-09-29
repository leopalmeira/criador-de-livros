#!/usr/bin/env bats

# Tests for book-generator

@test "generate_book.sh exists and is executable" {
    [ -x "./scripts/generate_book.sh" ]
}

@test "pandoc is available" {
    command -v pandoc || skip "pandoc not installed"
}

@test "markdown files can be created" {
    temp_md=$(mktemp /tmp/test_XXXXXX.md)
    echo "# Test" > "$temp_md"
    [ -f "$temp_md" ]
    rm "$temp_md"
}

@test "output directory can be created" {
    temp_dir=$(mktemp -d)
    [ -d "$temp_dir" ]
    rmdir "$temp_dir"
}

@test "date command works for timestamps" {
    run date +%Y-%m-%d
    [ "$status" -eq 0 ]
}

@test "script has proper shebang" {
    head -1 scripts/generate_book.sh | grep -q "#!/bin/bash"
}

@test "required tools check" {
    command -v echo
    command -v cat
    command -v mkdir
}
