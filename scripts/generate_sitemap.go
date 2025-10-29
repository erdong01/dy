package main

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
)

// Generates sitemap entries up to targetID. It preserves the XML header
// (everything before the first <url>) and appends sequential <url> entries
// starting after the last id found in the existing file.

func main() {
	targetID := 70000
	// paths
	repoRoot := filepath.Join(".")
	sitemapPath := filepath.Join(repoRoot, "dy_react", "public", "sitemap.xml")

	f, err := os.Open(sitemapPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed open sitemap: %v\n", err)
		os.Exit(1)
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	headerLines := []string{}
	urlRe := regexp.MustCompile(`id=(\d+)`)
	inURLSection := false
	lastID := 0

	for scanner.Scan() {
		line := scanner.Text()
		if !inURLSection && regexp.MustCompile(`^\s*<url>\s*$`).MatchString(line) {
			// first <url> encountered — stop header capture and remember this line as start of urls
			inURLSection = true
			headerLines = append(headerLines, line)
			continue
		}

		if !inURLSection {
			headerLines = append(headerLines, line)
			continue
		}

		// in url section — scan for ids
		if matches := urlRe.FindStringSubmatch(line); len(matches) == 2 {
			if id, err := strconv.Atoi(matches[1]); err == nil {
				if id > lastID {
					lastID = id
				}
			}
		}
	}
	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "scanner error: %v\n", err)
		os.Exit(1)
	}

	if lastID == 0 {
		// fallback: try to parse whole file for last id
		// (shouldn't happen for existing sitemap)
		fmt.Fprintln(os.Stderr, "warning: couldn't find existing ids; starting from 1")
		lastID = 1
	}

	fmt.Printf("found last id: %d; generating up to %d\n", lastID, targetID)

	// Build new sitemap content in a temp file then atomically replace
	tmpPath := sitemapPath + ".tmp"
	out, err := os.Create(tmpPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed create tmp: %v\n", err)
		os.Exit(1)
	}
	defer out.Close()

	// write header lines until first <url> (we included the first <url> line in headerLines)
	for _, l := range headerLines {
		fmt.Fprintln(out, l)
	}

	// write entries starting after lastID
	lastmod := "2025-08-13T12:40:24+00:00"
	for id := lastID + 1; id <= targetID; id++ {
		fmt.Fprintln(out, "")
		fmt.Fprintln(out, "  <url>")
		fmt.Fprintf(out, "    <loc>https://www.7x.chat/details?id=%d</loc>\n", id)
		fmt.Fprintf(out, "    <lastmod>%s</lastmod>\n", lastmod)
		fmt.Fprintln(out, "  </url>")
	}

	// close urlset
	fmt.Fprintln(out, "")
	fmt.Fprintln(out, "</urlset>")

	if err := out.Sync(); err != nil {
		fmt.Fprintf(os.Stderr, "sync error: %v\n", err)
		os.Exit(1)
	}

	if err := os.Rename(tmpPath, sitemapPath); err != nil {
		fmt.Fprintf(os.Stderr, "rename error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("sitemap generated successfully")
}
