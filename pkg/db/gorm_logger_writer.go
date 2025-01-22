package db

import "gorm.io/gorm/logger"

type Writer struct {
	writer logger.Writer
}

func NewWriter() *Writer {
	return &Writer{}
}
