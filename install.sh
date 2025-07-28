#!/usr/bin/env bash
# Line CLI Binary Installer (Bun-style Professional)
# Usage: curl -fsSL https://raw.githubusercontent.com/zereraz/line/main/install.sh | bash
set -euo pipefail

platform=$(uname -ms)

# Repository configuration
REPO="zereraz/line"
GITHUB=${GITHUB-"https://github.com"}
github_repo="$GITHUB/$REPO"

# Version to install (latest by default)
LATEST_VERSION="latest"
if [[ $# -gt 0 ]]; then
    LATEST_VERSION="$1"
fi

# Reset colors
Color_Off=''
Red=''
Green=''
Yellow=''
Blue=''
Cyan=''
Dim=''
Bold_White=''
Bold_Green=''
Bold_Cyan=''

# Enable colors if terminal supports it
if [[ -t 1 ]]; then
    Color_Off='\033[0m'
    Red='\033[0;31m'
    Green='\033[0;32m'
    Yellow='\033[1;33m'
    Blue='\033[0;34m'
    Cyan='\033[0;36m'
    Dim='\033[0;2m'
    Bold_White='\033[1m'
    Bold_Green='\033[1;32m'
    Bold_Cyan='\033[1;36m'
fi

# Fancy banner (Bun-style)
print_banner() {
    echo -e "${Bold_White}Line CLI${Color_Off} - Professional Linear project management"
    echo -e "${Dim}Installing standalone binary (no dependencies required)${Color_Off}"
    echo
}

# Logging functions (Bun-style)
error() {
    echo -e "${Red}error${Color_Off}:" "$@" >&2
    exit 1
}

info() {
    echo -e "${Dim}$@${Color_Off}"
}

info_bold() {
    echo -e "${Bold_White}$@${Color_Off}"
}

success() {
    echo -e "${Green}$@${Color_Off}"
}

warning() {
    echo -e "${Yellow}warning${Color_Off}:" "$@"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Advanced platform detection (like Bun)
detect_platform() {
    local target
    
    case $platform in
    'Darwin x86_64')
        target=darwin-x64
        ;;
    'Darwin arm64')
        target=darwin-arm64
        ;;
    'Linux aarch64' | 'Linux arm64')
        target=linux-arm64
        ;;
    'Linux x86_64' | *)
        target=linux-x64
        ;;
    esac

    # Check for Rosetta 2 on macOS (like Bun does)
    if [[ $target = darwin-x64 ]]; then
        if [[ $(sysctl -n sysctl.proc_translated 2>/dev/null) = 1 ]]; then
            target=darwin-arm64
            info "Your shell is running in Rosetta 2. Downloading Line CLI for $target instead"
        fi
    fi
    
    echo "$target"
}

# Get binary name for platform
get_binary_name() {
    local platform="$1"
    if [[ "$platform" == *"windows"* ]]; then
        echo "line-${platform}.exe"
    else
        echo "line-${platform}"
    fi
}

# Download binary
download_binary() {
    local platform="$1"
    local binary_name="$2"
    local url
    
    # Construct URL based on version
    if [[ "$LATEST_VERSION" == "latest" ]]; then
        url="${github_repo}/releases/latest/download/${binary_name}"
    else
        url="${github_repo}/releases/download/${LATEST_VERSION}/${binary_name}"
    fi
    
    local temp_file="/tmp/${binary_name}"
    
    info "Downloading Line CLI for ${platform}..."
    
    # Download with progress (Bun-style)
    if command_exists curl; then
        if ! curl --fail --location --progress-bar --output "$temp_file" "$url"; then
            error "Failed to download Line CLI from \"$url\""
        fi
    elif command_exists wget; then
        if ! wget --progress=bar:force -O "$temp_file" "$url"; then
            error "Failed to download Line CLI from \"$url\""
        fi
    else
        error "Neither curl nor wget is available"
    fi
    
    echo "$temp_file"
}

# Install binary (Bun-style)
install_binary() {
    local temp_file="$1"
    local install_env=LINE_INSTALL
    local bin_env=\$$install_env/bin
    local install_dir=${!install_env:-$HOME/.line}
    local bin_dir=$install_dir/bin
    local exe_name=line
    local exe=$bin_dir/$exe_name
    
    # Create installation directory
    if [[ ! -d $bin_dir ]]; then
        mkdir -p "$bin_dir" ||
            error "Failed to create install directory \"$bin_dir\""
    fi
    
    # Copy and make executable
    cp "$temp_file" "$exe" ||
        error "Failed to copy Line CLI binary"
    chmod +x "$exe" ||
        error "Failed to set permissions on Line CLI executable"
    
    # Clean up temp file
    rm -f "$temp_file"
    
    # Tilde path helper (like Bun)
    tildify() {
        if [[ $1 = $HOME/* ]]; then
            local replacement=\~/
            echo "${1/$HOME\//$replacement}"
        else
            echo "$1"
        fi
    }
    
    success "Line CLI was installed successfully to ${Bold_Green}$(tildify "$exe")"
    
    # Add to PATH if needed
    setup_path "$bin_dir" "$install_dir" "$install_env"
}

# Setup PATH (Bun-style shell integration)
setup_path() {
    local bin_dir="$1"
    local install_dir="$2"
    local install_env="$3"
    
    # Check if already in PATH
    if command -v line >/dev/null; then
        echo "Run 'line --help' to get started"
        return
    fi
    
    local refresh_command=''
    local tilde_bin_dir=$(tildify "$bin_dir")
    local quoted_install_dir=\"${install_dir//\"/\\\"}\"
    local bin_env="\$$install_env/bin"
    
    if [[ $quoted_install_dir = \"$HOME/* ]]; then
        quoted_install_dir=${quoted_install_dir/$HOME\//\$HOME/}
    fi
    
    echo
    
    # Shell-specific integration (like Bun)
    case $(basename "$SHELL") in
    fish)
        local commands=(
            "set --export $install_env $quoted_install_dir"
            "set --export PATH $bin_env \$PATH"
        )
        
        local fish_config=$HOME/.config/fish/config.fish
        local tilde_fish_config=$(tildify "$fish_config")
        
        if [[ -w $fish_config ]]; then
            {
                echo -e '\n# Line CLI'
                for command in "${commands[@]}"; do
                    echo "$command"
                done
            } >>"$fish_config"
            
            info "Added \"$tilde_bin_dir\" to \$PATH in \"$tilde_fish_config\""
            refresh_command="source $tilde_fish_config"
        else
            echo "Manually add the directory to $tilde_fish_config (or similar):"
            for command in "${commands[@]}"; do
                info_bold "  $command"
            done
        fi
        ;;
    zsh)
        local commands=(
            "export $install_env=$quoted_install_dir"
            "export PATH=\"$bin_env:\$PATH\""
        )
        
        local zsh_config=$HOME/.zshrc
        local tilde_zsh_config=$(tildify "$zsh_config")
        
        if [[ -w $zsh_config ]]; then
            {
                echo -e '\n# Line CLI'
                for command in "${commands[@]}"; do
                    echo "$command"
                done
            } >>"$zsh_config"
            
            info "Added \"$tilde_bin_dir\" to \$PATH in \"$tilde_zsh_config\""
            refresh_command="exec $SHELL"
        else
            echo "Manually add the directory to $tilde_zsh_config (or similar):"
            for command in "${commands[@]}"; do
                info_bold "  $command"
            done
        fi
        ;;
    bash)
        local commands=(
            "export $install_env=$quoted_install_dir"
            "export PATH=\"$bin_env:\$PATH\""
        )
        
        local bash_configs=(
            "$HOME/.bashrc"
            "$HOME/.bash_profile"
        )
        
        if [[ ${XDG_CONFIG_HOME:-} ]]; then
            bash_configs+=(
                "$XDG_CONFIG_HOME/.bash_profile"
                "$XDG_CONFIG_HOME/.bashrc"
                "$XDG_CONFIG_HOME/bash_profile"
                "$XDG_CONFIG_HOME/bashrc"
            )
        fi
        
        local set_manually=true
        for bash_config in "${bash_configs[@]}"; do
            local tilde_bash_config=$(tildify "$bash_config")
            
            if [[ -w $bash_config ]]; then
                {
                    echo -e '\n# Line CLI'
                    for command in "${commands[@]}"; do
                        echo "$command"
                    done
                } >>"$bash_config"
                
                info "Added \"$tilde_bin_dir\" to \$PATH in \"$tilde_bash_config\""
                refresh_command="source $bash_config"
                set_manually=false
                break
            fi
        done
        
        if [[ $set_manually = true ]]; then
            echo "Manually add the directory to ~/.bashrc (or similar):"
            for command in "${commands[@]}"; do
                info_bold "  $command"
            done
        fi
        ;;
    *)
        echo 'Manually add the directory to ~/.bashrc (or similar):'
        info_bold "  export $install_env=$quoted_install_dir"
        info_bold "  export PATH=\"$bin_env:\$PATH\""
        ;;
    esac
    
    echo
    info "To get started, run:"
    echo
    
    if [[ $refresh_command ]]; then
        info_bold "  $refresh_command"
    fi
    
    info_bold "  line --help"
}

# Verify installation
verify_installation() {
    local install_dir=${LINE_INSTALL:-$HOME/.line}
    local line_path="$install_dir/bin/line"
    
    if [ -x "$line_path" ]; then
        local version
        version=$("$line_path" --version 2>/dev/null || echo "unknown")
        return 0
    fi
    
    return 1
}

# Show post-install instructions (Bun-style)
show_instructions() {
    echo
    echo -e "${Bold_Cyan}Quick Start:${Color_Off}"
    info_bold "  line              # Dashboard"
    info_bold "  line issues       # List issues"  
    info_bold "  line -i           # Interactive mode"
    
    echo
    echo -e "${Dim}Line CLI - Professional Linear project management${Color_Off}"
}

# Uninstall function
uninstall_line() {
    info "Uninstalling Line CLI..."
    
    local install_dir=${LINE_INSTALL:-$HOME/.line}
    local binary_path="$install_dir/bin/line"
    
    if [ -f "$binary_path" ]; then
        rm -f "$binary_path"
        # Remove directory if empty
        rmdir "$install_dir/bin" 2>/dev/null || true
        rmdir "$install_dir" 2>/dev/null || true
        success "Removed Line CLI binary"
    else
        warning "Line CLI binary not found"
    fi
    
    success "Line CLI uninstalled successfully"
    echo "Note: You may want to remove PATH entries from your shell config manually"
}

# Main installation function
main() {
    # Check for uninstall flag
    if [[ "${1:-}" == "--uninstall" ]]; then
        uninstall_line
        exit 0
    fi
    
    print_banner
    
    local platform
    platform=$(detect_platform)
    info "Detected platform: $platform"
    
    local binary_name
    binary_name=$(get_binary_name "$platform")
    
    local temp_file
    temp_file=$(download_binary "$platform" "$binary_name")
    
    install_binary "$temp_file"
    
    if verify_installation; then
        show_instructions
    else
        error "Installation completed but verification failed"
    fi
}

# Handle script arguments
case "${1:-}" in
    --uninstall)
        main "$1"
        ;;
    --help)
        echo "Line CLI Binary Installer"
        echo ""
        echo "Usage:"
        echo "  curl -fsSL https://raw.githubusercontent.com/zereraz/line/main/install.sh | bash"
        echo "  curl -fsSL https://raw.githubusercontent.com/zereraz/line/main/install.sh | bash -s -- v0.0.1"
        echo "  curl -fsSL https://raw.githubusercontent.com/zereraz/line/main/install.sh | bash -s -- --uninstall"
        echo ""
        echo "Features:"
        echo "  - No runtime dependencies (standalone binary)"
        echo "  - Professional Linear project management"
        echo "  - Interactive mode with keyboard navigation"
        echo "  - SQLite caching for offline-first experience"
        echo ""
        echo "Supported platforms:"
        echo "  - Linux (x64, arm64)"
        echo "  - macOS (x64, arm64)"  
        echo "  - Windows (x64)"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac