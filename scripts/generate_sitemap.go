package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"time"
)

const (
	defaultTargetID = 70000
	chunkSize       = 5000
)

var headerLines = []string{
	`<?xml version="1.0" encoding="UTF-8"?>`,
	`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
	`  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9`,
	`            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">`,
	``,
	`  <!-- created with Free Online Sitemap Generator www.xml-sitemaps.com -->`,
}

func main() {
	targetID := defaultTargetID
	if len(os.Args) > 1 {
		parsed, err := strconv.Atoi(os.Args[1])
		if err != nil || parsed <= 0 {
			fmt.Fprintf(os.Stderr, "invalid target id: %v\n", os.Args[1])
			os.Exit(1)
		}
		targetID = parsed
	}

	repoRoot := "."
	// try to locate repo root (directory containing go.mod) so the script works
	// regardless of the current working directory (e.g., when run from scripts/)
	if root, err := findRepoRoot(); err == nil {
		repoRoot = root
	}
	outputDir := filepath.Join(repoRoot, "dy_react", "public")

	// ensure output directory exists
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		fmt.Fprintf(os.Stderr, "failed to create output dir %s: %v\n", outputDir, err)
		os.Exit(1)
	}

	// detect existing sitemaps and continue from the last generated id
	existingMaxID, nextIndex, err := detectExistingState(outputDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to detect existing sitemaps: %v\n", err)
		os.Exit(1)
	}

	if existingMaxID >= targetID {
		fmt.Printf("nothing to do: existing max id %d >= target %d\n", existingMaxID, targetID)
		return
	}

	startID := existingMaxID + 1
	lastmod := time.Now().UTC().Format(time.RFC3339)

	// generate files starting at nextIndex
	curIndex := nextIndex
	curStart := startID
	for curStart <= targetID {
		curEnd := curStart + chunkSize - 1
		if curEnd > targetID {
			curEnd = targetID
		}

		filename := "sitemap.xml"
		if curIndex > 0 {
			filename = fmt.Sprintf("sitemap%d.xml", curIndex)
		}
		outPath := filepath.Join(outputDir, filename)

		includeHomepage := (curIndex == 0 && existingMaxID == 0)
		if err := writeSitemapFile(outPath, includeHomepage, curStart, curEnd, lastmod); err != nil {
			fmt.Fprintf(os.Stderr, "failed to write %s: %v\n", filename, err)
			os.Exit(1)
		}
		fmt.Printf("generated %s with ids %d-%d\n", filename, curStart, curEnd)

		curIndex++
		curStart = curEnd + 1
	}
}

// findRepoRoot walks up from the current working directory until it finds a go.mod
// file and returns that directory. If not found, returns an error.
func findRepoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	cur := wd
	for {
		try := filepath.Join(cur, "go.mod")
		if _, err := os.Stat(try); err == nil {
			return cur, nil
		}
		parent := filepath.Dir(cur)
		if parent == cur {
			break
		}
		cur = parent
	}
	return "", fmt.Errorf("go.mod not found in any parent directories (starting at %s)", wd)
}

// remove stale sitemap chunk files so we regenerate from a clean slate
func cleanupExistingSitemaps(dir string) error {
	pattern := filepath.Join(dir, "sitemap*.xml")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return err
	}
	for _, path := range matches {
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return err
		}
	}
	return nil
}

// detectExistingState inspects existing sitemap*.xml files in dir and returns
// the highest numeric id found and the next index to use for new files.
// nextIndex is 0 for sitemap.xml, 1 for sitemap1.xml, etc.
func detectExistingState(dir string) (maxID int, nextIndex int, err error) {
	pattern := filepath.Join(dir, "sitemap*.xml")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return 0, 0, err
	}
	if len(matches) == 0 {
		return 0, 0, nil
	}

	// determine highest index present
	maxIndex := -1
	idRe := regexpMustCompile(`id=(\d+)`)
	for _, p := range matches {
		base := filepath.Base(p)
		if base == "sitemap.xml" {
			if maxIndex < 0 {
				maxIndex = 0
			}
		} else {
			// try to parse sitemapN.xml
			var idx int
			n, _ := fmt.Sscanf(base, "sitemap%d.xml", &idx)
			if n == 1 && idx > maxIndex {
				maxIndex = idx
			}
		}

		// scan file for max id
		data, rerr := os.ReadFile(p)
		if rerr != nil {
			return 0, 0, rerr
		}
		for _, m := range idRe.FindAllStringSubmatch(string(data), -1) {
			if len(m) == 2 {
				if id, perr := strconv.Atoi(m[1]); perr == nil && id > maxID {
					maxID = id
				}
			}
		}
	}

	if maxIndex < 0 {
		maxIndex = 0
	}
	return maxID, maxIndex + 1, nil
}

// small helpers to avoid importing regexp at top-level repeatedly
func regexpMustCompile(s string) *regexp.Regexp {
	return regexp.MustCompile(s)
}

func writeSitemapFile(path string, includeHomepage bool, startID, endID int, lastmod string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	for _, line := range headerLines {
		if _, err := fmt.Fprintln(f, line); err != nil {
			return err
		}
	}

	if includeHomepage {
		if err := writeURLEntry(f, "https://www.7x.chat/", lastmod); err != nil {
			return err
		}
		if _, err := fmt.Fprintln(f, ""); err != nil {
			return err
		}
		if _, err := fmt.Fprintln(f, "  <!-- 详情页面 -->"); err != nil {
			return err
		}
	}

	for id := startID; id <= endID; id++ {
		loc := fmt.Sprintf("https://www.7x.chat/details?id=%d", id)
		if err := writeURLEntry(f, loc, lastmod); err != nil {
			return err
		}
	}

	if _, err := fmt.Fprintln(f, ""); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(f, "</urlset>"); err != nil {
		return err
	}

	return f.Sync()
}

func writeURLEntry(f *os.File, loc, lastmod string) error {
	if _, err := fmt.Fprintln(f, ""); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(f, "  <url>"); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(f, "    <loc>%s</loc>\n", loc); err != nil {
		return err
	}
	if _, err := fmt.Fprintf(f, "    <lastmod>%s</lastmod>\n", lastmod); err != nil {
		return err
	}
	if _, err := fmt.Fprintln(f, "  </url>"); err != nil {
		return err
	}
	return nil
}
