package config

// Zap 日志配置
type Zap struct {
	Level         string `mapstructure:"level" json:"level" yaml:"level"`                            // 日志级别: debug, info, warn, error, dpanic, panic, fatal
	Prefix        string `mapstructure:"prefix" json:"prefix" yaml:"prefix"`                         // 日志前缀
	Format        string `mapstructure:"format" json:"format" yaml:"format"`                         // 输出格式: json, console
	Director      string `mapstructure:"director" json:"director" yaml:"director"`                   // 日志文件夹
	EncodeLevel   string `mapstructure:"encode-level" json:"encode-level" yaml:"encode-level"`       // 编码级别: lowercase, capital, lowercase-color, capital-color
	StacktraceKey string `mapstructure:"stacktrace-key" json:"stacktrace-key" yaml:"stacktrace-key"` // 栈名
	MaxAge        int    `mapstructure:"max-age" json:"max-age" yaml:"max-age"`                      // 日志留存时间(天)
	ShowLine      bool   `mapstructure:"show-line" json:"show-line" yaml:"show-line"`                // 显示行号
	LogInConsole  bool   `mapstructure:"log-in-console" json:"log-in-console" yaml:"log-in-console"` // 输出到控制台
	MaxSize       int    `mapstructure:"max-size" json:"max-size" yaml:"max-size"`                   // 单个日志文件最大大小(MB)
	MaxBackups    int    `mapstructure:"max-backups" json:"max-backups" yaml:"max-backups"`          // 保留旧文件的最大个数
	Compress      bool   `mapstructure:"compress" json:"compress" yaml:"compress"`                   // 是否压缩
}
