#!/bin/bash

# Book Generator Demo
# Automated technical documentation generation

set -e

echo "======================================="
echo "  Book Generator Demo"
echo "  Automated Technical Documentation"
echo "======================================="
echo ""

if [ ! -f "./scripts/generate_book.sh" ]; then
    echo "❌ scripts/generate_book.sh not found — is this the book-generator repo root?"
    exit 1
fi

echo "Demo 1: Generating Sample Chapter"
echo "=================================="
cat > /tmp/demo_chapter.md <<'EOF'
# Chapter 1: Introduction to Automation

This chapter explores the fundamentals of DevOps automation.

## Key Concepts

- Infrastructure as Code (IaC)
- Continuous Integration/Continuous Deployment (CI/CD)
- Configuration Management
- Monitoring and Observability

## Benefits of Automation

1. **Consistency**: Reduces human error
2. **Speed**: Faster deployment cycles
3. **Scalability**: Handle growth efficiently
4. **Reliability**: Repeatable processes

## Code Example

\`\`\`bash
#!/bin/bash
echo "Hello, Automation!"
\`\`\`

## Summary

Automation is the foundation of modern DevOps practices.
EOF

echo "✓ Sample chapter created: /tmp/demo_chapter.md"
echo ""

echo "Demo 2: Checking Pandoc Availability"
echo "====================================="
if command -v pandoc &> /dev/null; then
    echo "✓ Pandoc installed"
    pandoc --version | head -1
    echo ""
    
    echo "Demo 3: Converting Markdown to PDF"
    echo "===================================="
    pandoc /tmp/demo_chapter.md -o /tmp/demo_chapter.pdf 2>/dev/null && \
        echo "✓ PDF generated: /tmp/demo_chapter.pdf" || \
        echo "⚠️  PDF generation requires LaTeX (install texlive)"
    echo ""
    
    echo "Demo 4: Converting Markdown to HTML"
    echo "===================================="
    pandoc /tmp/demo_chapter.md -o /tmp/demo_chapter.html --standalone
    echo "✓ HTML generated: /tmp/demo_chapter.html"
    echo ""
else
    echo "⚠️  Pandoc not installed"
    echo "Install: brew install pandoc (macOS) or apt install pandoc (Ubuntu)"
    echo ""
fi

echo "Demo 5: Running Tests"
echo "====================="
if command -v bats &> /dev/null && [ -d tests ]; then
    bats tests/ || echo "Tests completed"
else
    echo "Install BATS for testing: brew install bats-core"
fi
echo ""

echo "======================================="
echo "  Book Generator Capabilities"
echo "======================================="
echo ""
echo "Supported Formats:"
echo "  • PDF (via LaTeX)"
echo "  • HTML (standalone or chapters)"
echo "  • EPUB (e-books)"
echo "  • DOCX (Microsoft Word)"
echo "  • Markdown (source format)"
echo ""
echo "Features:"
echo "  ✓ Multi-chapter book generation"
echo "  ✓ Table of contents automation"
echo "  ✓ Code syntax highlighting"
echo "  ✓ Cross-references and links"
echo "  ✓ Metadata management"
echo "  ✓ Custom styling support"
echo ""
echo "Use Cases:"
echo "  • Technical documentation"
echo "  • API references"
echo "  • User manuals"
echo "  • Training materials"
echo "  • Research papers"
echo ""

echo "======================================="
echo "  Next Steps"
echo "======================================="
echo ""
echo "1. Review sample output:"
echo "   open /tmp/demo_chapter.html"
echo ""
echo "2. Create your own chapters:"
echo "   cp /tmp/demo_chapter.md my_chapter.md"
echo ""
echo "3. Generate full book:"
echo "   ./generate_book.sh"
echo ""
echo "4. Run tests:"
echo "   bats tests/"
echo ""
echo "Repository: https://github.com/wesleyscholl/book-generator"
echo "Format Support: Markdown → PDF/HTML/EPUB/DOCX"

# Cleanup
rm -f /tmp/demo_chapter.md
