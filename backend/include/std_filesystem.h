#pragma once

#if __has_include(<filesystem>) && (__cplusplus >= 201703L)
  #include <filesystem>
  namespace fs = std::filesystem;
#elif __has_include(<experimental/filesystem>)
  #include <experimental/filesystem>
  namespace fs = std::experimental::filesystem;
#else
  // Fallback compatibility wrapper for old compiler toolchains (MinGW GCC without std::filesystem)
  #include <string>
  #include <fstream>
  #include <cstdio>
  #include <sys/stat.h>
  #include <sys/types.h>
  #include <stdexcept>
  #include <system_error>

  #ifdef _WIN32
    #include <direct.h>
    #include <io.h>
  #else
    #include <unistd.h>
  #endif

  namespace fs {

  class filesystem_error : public std::runtime_error {
  public:
      explicit filesystem_error(const std::string& msg) : std::runtime_error(msg) {}
  };

  inline bool exists(const std::string& filePath) {
      struct stat info;
      return (stat(filePath.c_str(), &info) == 0);
  }

  inline bool create_directories(const std::string& dirPath) {
      if (dirPath.empty()) return true;
      std::string path = dirPath;
      for (char& c : path) {
          if (c == '\\') c = '/';
      }
      
      std::size_t pos = 0;
      while ((pos = path.find('/', pos)) != std::string::npos) {
          std::string sub = path.substr(0, pos);
          if (!sub.empty() && !exists(sub)) {
              #ifdef _WIN32
                _mkdir(sub.c_str());
              #else
                mkdir(sub.c_str(), 0777);
              #endif
          }
          pos++;
      }
      if (!exists(path)) {
          #ifdef _WIN32
            _mkdir(path.c_str());
          #else
            mkdir(path.c_str(), 0777);
          #endif
      }
      return true;
  }

  inline bool copy_file(const std::string& from, const std::string& to) {
      std::ifstream src(from, std::ios::binary);
      std::ofstream dst(to, std::ios::binary);
      if (!src || !dst) {
          return false;
      }
      dst << src.rdbuf();
      return true;
  }

  inline bool remove(const std::string& filePath) {
      return std::remove(filePath.c_str()) == 0;
  }

  class path {
  public:
      path() = default;
      path(const std::string& p) : p_(p) {}
      path(const char* p) : p_(p) {}
      
      std::string string() const { return p_; }
      
      path parent_path() const {
          std::size_t found = p_.find_last_of("/\\");
          if (found == std::string::npos) {
              return path("");
          }
          return path(p_.substr(0, found));
      }
      
  private:
      std::string p_;
  };

  inline bool remove(const path& p) {
      return remove(p.string());
  }

  inline bool remove(const path& p, std::error_code&) {
      return remove(p.string());
  }

  } // namespace fs
#endif
