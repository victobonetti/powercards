export type Language = 'en' | 'pt';

export interface Translations {
    common: {
        loading: string;
        save: string;
        cancel: string;
        delete: string;
        edit: string;
        create: string;
        confirm: string;
        search: string;
        upload: string;
        back: string;
        next: string;
        finish: string;
    };
    navigation: {
        dashboard: string;
        decks: string;
        notes: string;
        tags: string;
        factory: string;
        profile: string;
        upload: string;
        logout: string;
        login: string;
        register: string;
        workspace: string;
    };
    home: {
        welcome: string;
        uploadTitle: string;
        uploadDescription: string;
        dragDrop: string;
    };
    decks: {
        title: string;
        description: string;
        newDeck: string;
        empty: string;
        searchPlaceholder: string;
        createTitle: string;
        createDescription: string;
        deckNamePlaceholder: string;
        editTitle: string;
        editDescription: string;
        deleteTitle: string;
        deleteDescription: string;
        deleteConfirmPlaceholder: string;
        deleteAction: string;
    };
    notes: {
        title: string;
        description: string;
        newNote: string;
        empty: string;
        searchPlaceholder: string;
        createTitle: string;
        modelLabel: string;
        tagsLabel: string;
        createAction: string;
        bulkSelected: string;
        bulkAddTags: string;
        bulkDelete: string;
        deleteTitle: string;
        deleteDescription: string;
        unsavedChangesTitle: string;
        unsavedChangesDescription: string;
    };
    factory: {
        title: string;
        description: string;
        generate: string;
        newChat: string;
        history: string;
        noHistory: string;
        selectChat: string;
        startNewChat: string;
        thinking: string;
        typeMessage: string;
        send: string;
    };
    help: {
        welcomeTitle: string;
        welcomeDescription: string;
        workspacesTitle: string;
        workspacesDescription: string;
        uploadTitle: string;
        uploadDescription: string;
        manageTitle: string;
        manageDescription: string;
        profileTitle: string;
        profileDescription: string;
        aiTitle: string;
        aiDescription: string;
    };
    auth: {
        loginTitle: string;
        welcomeBack: string;
        signInDescription: string;
        emailLabel: string;
        passwordLabel: string;
        emailPlaceholder: string;
        passwordPlaceholder: string;
        signInButton: string;
        orContinueWith: string;
        continueWithGoogle: string;
        dontHaveAccount: string;
        registerNow: string;

        registerTitle: string;
        startJourney: string;
        joinThousands: string;
        stepLabel: string;
        authStep: string;
        profileStep: string;
        persoStep: string;

        firstNameLabel: string;
        lastNameLabel: string;
        usernameLabel: string;
        firstNamePlaceholder: string;
        lastNamePlaceholder: string;
        usernamePlaceholder: string;

        learnGoalLabel: string;
        learnGoalPlaceholder: string;
        newsletter: string;
        newsletterDetail: string;
        termsAccept: string;
        termsOfService: string;
        privacyPolicy: string;
        and: string;
        createAccount: string;

        welcomeHeadline: string;
        successSubtext: string;
        redirecting: string;
        goLogin: string;

        looksGood: string;
        usernameGood: string;
        usernameHelp: string;

        weak: string;
        fair: string;
        good: string;
        strong: string;
        weakHint: string;
        fairHint: string;
        goodHint: string;
        strongHint: string;
        alreadyHaveAccount: string;

        emailTaken: string;
        usernameTaken: string;
        checking: string;

        forgotPassword: string;
        resetPasswordTitle: string;
        resetPasswordDescription: string;
        sendResetLink: string;
        checkYourEmail: string;
        checkYourEmailDescription: string;
        backToLogin: string;

        mfaTitle: string;
        mfaDescription: string;
        mfaEnabled: string;
        mfaDisabled: string;
        enableMfa: string;
        disableMfa: string;
        mfaSetupTitle: string;
        mfaSetupDescription: string;
        mfaScanQr: string;
        mfaEnterCode: string;
        mfaCodePlaceholder: string;
        mfaVerify: string;
        mfaSetupSuccess: string;
        mfaSkip: string;
        mfaRequired: string;
        searchDecks: string;
        ankiBridge: string;
        yourLibrary: string;
        importAnki: string;
        exportAnki: string;
        exportAll: string;
        importDescription: string;
        importSuccess: string;
        importStats: string;
        whatsNext: string;
        studyNow: string;
        viewDecks: string;
        conflictDetected: string;
        mergeDecks: string;
        keepSeparate: string;
    };
    tags: {
        title: string;
        description: string;
        searchPlaceholder: string;
        count: string;
        nameHeader: string;
        notesHeader: string;
        actionsHeader: string;
        deleteTitle: string;
        deleteDescription: string;
        cancel: string;
        deleteAction: string;
        empty: string;
    };
    profile: {
        uploadBanner: string;
        changeBanner: string;
        uploadAvatar: string;
        displayName: string;
        email: string;
        editProfile: string;
        cancel: string;
        save: string;
        statistics: string;
        decksCreated: string;
        notesAdded: string;
        daysStreak: string;
        appearance: string;
        colorPalette: string;
        themeDescription: string;
        aboutMe: string;
        aboutPlaceholder: string;
        markdownSupport: string;
        noBio: string;
        addBio: string;
        uploading: string;
        success: string;
        error: string;
        security: string;
    };
    aiSettings: {
        title: string;
        provider: string;
        providerPlaceholder: string;
        apiKey: string;
        apiKeyPlaceholder: string;
        saveKey: string;
        configured: string;
        notConfigured: string;
        saved: string;
        saveFailed: string;
        openai: string;
        gemini: string;
        deepseek: string;
        description: string;
        removeKey: string;
        keyRemoved: string;
    };
    aiModal: {
        title: string;
        description: string;
        configureNow: string;
    };
    upload: {
        title: string;
        description: string;
        fileUpload: string;
        dragDrop: string;
        successTitle: string;
        imported: string;
        updated: string;
        partialTitle: string;
        skipped: string;
        done: string;
        overwrite: string;
        errorTitle: string;
        selectFile: string;
        uploading: string;
        uploadButton: string;
        errorTooLarge: string;
        errorGeneric: string;
    };
}

export const translations: Record<Language, Translations> = {
    en: {
        common: {
            loading: "Loading...",
            save: "Save",
            cancel: "Cancel",
            delete: "Delete",
            edit: "Edit",
            create: "Create",
            confirm: "Confirm",
            search: "Search...",
            upload: "Upload",
            back: "Back",
            next: "Next",
            finish: "Finish",
        },
        navigation: {
            dashboard: "Dashboard",
            decks: "Decks",
            notes: "Notes",
            tags: "Tags",
            factory: "Card Factory",
            profile: "Profile",
            upload: "Upload .Apkg",
            logout: "Logout",
            login: "Login",
            register: "Register",
            workspace: "Workspace",
        },
        home: {
            welcome: "Welcome to PowerCards",
            uploadTitle: "Upload Anki Package",
            uploadDescription: "Import your existing Anki decks to get started",
            dragDrop: "Drag and drop your .apkg file here",
        },
        decks: {
            title: "My Decks",
            description: "Manage your flashcard decks",
            newDeck: "New Deck",
            empty: "No decks found. Create one or upload an Anki package.",
            searchPlaceholder: "Search decks...",
            createTitle: "Create New Deck",
            createDescription: "Enter a name for your new deck.",
            deckNamePlaceholder: "Deck name",
            editTitle: "Edit Deck",
            editDescription: "Rename your deck.",
            deleteTitle: "Delete Deck",
            deleteDescription: "This action cannot be undone. Please type the deck name to confirm.",
            deleteConfirmPlaceholder: "Type deck name to confirm",
            deleteAction: "Delete Deck",
        },
        notes: {
            title: "My Notes",
            description: "Manage your notes and sources",
            newNote: "New Note",
            empty: "No notes found.",
            searchPlaceholder: "Search content or tag=...",
            createTitle: "Create New Note",
            modelLabel: "Note Model",
            tagsLabel: "Tags",
            createAction: "Create Note",
            bulkSelected: "selected",
            bulkAddTags: "Add Tags",
            bulkDelete: "Delete",
            deleteTitle: "Delete Note",
            deleteDescription: "Are you sure you want to delete this note? This action cannot be undone.",
            unsavedChangesTitle: "Unsaved Changes",
            unsavedChangesDescription: "You have unsaved changes. Are you sure you want to discard them?",
        },
        factory: {
            title: "Flashcard Factory",
            description: "Generate flashcards from your content using AI",
            generate: "Generate Cards",
            newChat: "New Chat",
            history: "History",
            noHistory: "No chat history",
            selectChat: "Select a chat or create a new one to start.",
            startNewChat: "Start New Chat",
            thinking: "Thinking...",
            typeMessage: "Type a message...",
            send: "Send",
        },
        help: {
            welcomeTitle: "Welcome to PowerCards",
            welcomeDescription: "Your advanced Anki deck manager. Let's get you started with a quick tour of the main features.",
            workspacesTitle: "1. Workspaces",
            workspacesDescription: "Organize your decks and notes into isolated Workspaces. Use the selector in the sidebar to create new workspaces or switch contexts.",
            uploadTitle: "2. Upload Anki Files",
            uploadDescription: "Upload your existing .apkg files. PowerCards works directly with your Anki collection. Just drag and drop to import.",
            manageTitle: "3. Manage & Edit",
            manageDescription: "Browse your decks, search for notes, edit fields, and manage tags. All changes are synchronized with your database.",
            profileTitle: "4. Profile & Themes",
            profileDescription: "Customize your experience. Click your avatar to access the Profile menu where you can change your theme color, update your bio, and manage your account settings.",
            aiTitle: "5. AI Features",
            aiDescription: "Power up your learning with AI. Use the 'Flashcard Factory' to automatically generate cards from text, or chat with your knowledge base for deeper insights.",
        },
        auth: {
            loginTitle: "Login",
            welcomeBack: "Welcome back",
            signInDescription: "Please enter your details to sign in.",
            emailLabel: "Email address",
            passwordLabel: "Password",
            emailPlaceholder: "name@example.com",
            passwordPlaceholder: "Enter your password",
            signInButton: "Sign in",
            orContinueWith: "OR CONTINUE WITH",
            continueWithGoogle: "Continue with Google",
            dontHaveAccount: "Don't have an account?",
            registerNow: "Register now",

            registerTitle: "Create your account",
            startJourney: "Start your learning journey today.",
            joinThousands: "Join thousands of learners using AI-powered flashcards to master any subject, faster.",
            stepLabel: "STEP {step} OF 3 — {name}",
            authStep: "AUTHENTICATION",
            profileStep: "PROFILE",
            persoStep: "PERSONALIZATION",

            firstNameLabel: "First name",
            lastNameLabel: "Last name",
            usernameLabel: "Username",
            firstNamePlaceholder: "John",
            lastNamePlaceholder: "Doe",
            usernamePlaceholder: "johndoe",

            learnGoalLabel: "What are you studying?",
            learnGoalPlaceholder: "e.g., Medical boards, Spanish, Bar exam...",
            newsletter: "Keep me updated",
            newsletterDetail: "Minor updates and tips to improve your learning.",
            termsAccept: "I agree to the",
            termsOfService: "Terms of Service",
            privacyPolicy: "Privacy Policy",
            and: "and",
            createAccount: "Create Account",

            welcomeHeadline: "Welcome to PowerCards!",
            successSubtext: "Your account has been created successfully. We're getting things ready for you.",
            redirecting: "Redirecting you to login",
            goLogin: "Go to Login",

            looksGood: "Looks good",
            usernameGood: "Username looks good",
            usernameHelp: "3-20 characters, letters, numbers, and underscores only",

            weak: "Weak",
            fair: "Fair",
            good: "Good",
            strong: "Strong",
            weakHint: "Too short",
            fairHint: "Add numbers or symbols",
            goodHint: "Add mixed case",
            strongHint: "Excellent! Your password is strong",
            alreadyHaveAccount: "Already have an account? Sign in",

            emailTaken: "This email is already registered",
            usernameTaken: "This username is already taken",
            checking: "Checking...",

            forgotPassword: "Forgot password?",
            resetPasswordTitle: "Reset your password",
            resetPasswordDescription: "Enter your email address and we'll send you a link to reset your password.",
            sendResetLink: "Send reset link",
            checkYourEmail: "Check your email",
            checkYourEmailDescription: "We've sent a password reset link to your email address. Please check your inbox.",
            backToLogin: "Back to login",

            mfaTitle: "Two-Factor Authentication",
            mfaDescription: "Add an extra layer of security to your account using an authenticator app.",
            mfaEnabled: "Enabled",
            mfaDisabled: "Disabled",
            enableMfa: "Enable 2FA",
            disableMfa: "Disable 2FA",
            mfaSetupTitle: "Set up Two-Factor Authentication",
            mfaSetupDescription: "Scan the QR code below with your authenticator app (e.g. Google Authenticator, Authy).",
            mfaScanQr: "Scan this QR code",
            mfaEnterCode: "Enter the 6-digit code from your app",
            mfaCodePlaceholder: "000000",
            mfaVerify: "Verify & Enable",
            mfaSetupSuccess: "Two-factor authentication has been enabled!",
            mfaSkip: "Skip for now",
            mfaRequired: "Set up two-factor authentication to secure your account.",
            searchDecks: "Search decks...",
            ankiBridge: "Anki Bridge",
            yourLibrary: "Your Library",
            importAnki: "Import from Anki",
            exportAnki: "Export to Anki",
            exportAll: "Export All Decks",
            importDescription: "Drag and drop your .apkg file here or click to browse.",
            importSuccess: "Successfully imported!",
            importStats: "{n} cards added, {t} tags organized",
            whatsNext: "What's next?",
            studyNow: "Study This Deck",
            viewDecks: "View All Decks",
            conflictDetected: "Conflict detected: {name}",
            mergeDecks: "Merge with existing",
            keepSeparate: "Keep separate",
        },
        tags: {
            title: "Tags",
            description: "Manage your collection tags. Click on a tag to view all notes with that tag.",
            searchPlaceholder: "Search tags...",
            count: "tags",
            nameHeader: "Name",
            notesHeader: "Notes",
            actionsHeader: "Actions",
            deleteTitle: "Delete Tag",
            deleteDescription: "Are you sure you want to delete the tag",
            cancel: "Cancel",
            deleteAction: "Delete Tag",
            empty: "No tags found.",
        },
        profile: {
            uploadBanner: "Upload Banner",
            changeBanner: "Change Banner",
            uploadAvatar: "Upload Avatar",
            displayName: "Display Name",
            email: "Email",
            editProfile: "Edit Profile",
            cancel: "Cancel",
            save: "Save",
            statistics: "Statistics",
            decksCreated: "Decks Created",
            notesAdded: "Notes Added",
            daysStreak: "Days Streak",
            appearance: "Appearance",
            colorPalette: "Color Palette",
            themeDescription: "Select a color theme for your interface.",
            aboutMe: "About Me",
            aboutPlaceholder: "Write something about yourself... (Markdown supported)",
            markdownSupport: "Supports Markdown: **bold**, _italic_, # headers, - lists, etc.",
            noBio: "No bio added yet.",
            addBio: "Click to add a bio",
            uploading: "Uploading...",
            success: "Success",
            error: "Error",
            security: "Security",
        },
        aiSettings: {
            title: "AI Settings",
            provider: "AI Provider",
            providerPlaceholder: "Select a provider",
            apiKey: "API Key",
            apiKeyPlaceholder: "Paste your API key here",
            saveKey: "Save AI Settings",
            configured: "Configured",
            notConfigured: "Not configured",
            saved: "AI settings saved successfully",
            saveFailed: "Failed to save AI settings",
            openai: "OpenAI (GPT-4o Mini)",
            gemini: "Google Gemini (2.0 Flash)",
            deepseek: "DeepSeek (Chat)",
            description: "Configure your own API key to power AI features like note enhancement.",
            removeKey: "Remove Key",
            keyRemoved: "API key removed",
        },
        aiModal: {
            title: "API Key Required",
            description: "To use AI features, you need to configure an API key. Go to your profile settings to set up your preferred AI provider.",
            configureNow: "Configure Now",
        },
        upload: {
            title: "Upload Anki Collection",
            description: "Import your existing .apkg files to start studying.",
            fileUpload: "File Upload",
            dragDrop: "Drag and drop your .apkg file here or click to browse.",
            successTitle: "Import Successful!",
            imported: "Imported",
            updated: "Updated",
            partialTitle: "Duplicates Found",
            skipped: "Skipped (Duplicates)",
            done: "Done",
            overwrite: "Overwrite All",
            errorTitle: "Upload Failed",
            selectFile: "Anki Package (.apkg)",
            uploading: "Uploading...",
            uploadButton: "Upload",
            errorTooLarge: "File too large. Please upload a smaller file.",
            errorGeneric: "Upload failed. Please try again.",
        },
    },
    pt: {
        common: {
            loading: "Carregando...",
            save: "Salvar",
            cancel: "Cancelar",
            delete: "Excluir",
            edit: "Editar",
            create: "Criar",
            confirm: "Confirmar",
            search: "Pesquisar...",
            upload: "Enviar",
            back: "Voltar",
            next: "Próximo",
            finish: "Finalizar",
        },
        navigation: {
            dashboard: "Painel",
            decks: "Baralhos",
            notes: "Notas",
            tags: "Etiquetas",
            factory: "Fábrica de Cartões",
            profile: "Perfil",
            upload: "Enviar .Apkg",
            logout: "Sair",
            login: "Entrar",
            register: "Registrar",
            workspace: "Área de Trabalho",
        },
        home: {
            welcome: "Bem-vindo ao PowerCards",
            uploadTitle: "Enviar Pacote Anki",
            uploadDescription: "Importe seus baralhos Anki existentes para começar",
            dragDrop: "Arraste e solte seu arquivo .apkg aqui",
        },
        decks: {
            title: "Meus Baralhos",
            description: "Gerencie seus baralhos de flashcards",
            newDeck: "Novo Baralho",
            empty: "Nenhum baralho encontrado. Crie um ou envie um pacote Anki.",
            searchPlaceholder: "Pesquisar baralhos...",
            createTitle: "Criar Novo Baralho",
            createDescription: "Digite um nome para o seu novo baralho.",
            deckNamePlaceholder: "Nome do baralho",
            editTitle: "Editar Baralho",
            editDescription: "Renomeie seu baralho.",
            deleteTitle: "Excluir Baralho",
            deleteDescription: "Esta ação não pode ser desfeita. Digite o nome do baralho para confirmar.",
            deleteConfirmPlaceholder: "Digite o nome para confirmar",
            deleteAction: "Excluir Baralho",
        },
        notes: {
            title: "Minhas Notas",
            description: "Gerencie suas notas e fontes",
            newNote: "Nova Nota",
            empty: "Nenhuma nota encontrada.",
            searchPlaceholder: "Pesquisar conteúdo ou tag=...",
            createTitle: "Criar Nova Nota",
            modelLabel: "Modelo da Nota",
            tagsLabel: "Etiquetas",
            createAction: "Criar Nota",
            bulkSelected: "selecionado(s)",
            bulkAddTags: "Adicionar Etiquetas",
            bulkDelete: "Excluir",
            deleteTitle: "Excluir Nota",
            deleteDescription: "Tem certeza que deseja excluir esta nota? Esta ação não pode ser desfeita.",
            unsavedChangesTitle: "Alterações não salvas",
            unsavedChangesDescription: "Você tem alterações não salvas. Tem certeza que deseja descartá-las?",
        },
        factory: {
            title: "Fábrica de Cartões",
            description: "Gere flashcards do seu conteúdo usando IA",
            generate: "Gerar Cartões",
            newChat: "Novo Chat",
            history: "Histórico",
            noHistory: "Sem histórico de chat",
            selectChat: "Selecione um chat ou crie um novo para começar.",
            startNewChat: "Iniciar Novo Chat",
            thinking: "Pensando...",
            typeMessage: "Digite uma mensagem...",
            send: "Enviar",
        },
        help: {
            welcomeTitle: "Bem-vindo ao PowerCards",
            welcomeDescription: "Seu gerenciador avançado de baralhos Anki. Vamos começar com um tour rápido pelas principais funcionalidades.",
            workspacesTitle: "1. Áreas de Trabalho",
            workspacesDescription: "Organize seus baralhos e notas em Áreas de Trabalho isoladas. Use o seletor na barra lateral para criar novas áreas ou alternar contextos.",
            uploadTitle: "2. Enviar Arquivos Anki",
            uploadDescription: "Envie seus arquivos .apkg existentes. O PowerCards trabalha diretamente com sua coleção Anki. Basta arrastar e soltar para importar.",
            manageTitle: "3. Gerenciar e Editar",
            manageDescription: "Navegue por seus baralhos, pesquise notas, edite campos e gerencie etiquetas. Todas as alterações são sincronizadas com seu banco de dados.",
            profileTitle: "4. Perfil e Temas",
            profileDescription: "Personalize sua experiência. Clique em seu avatar para acessar o menu Perfil onde você pode alterar a cor do tema, atualizar sua biografia e gerenciar configurações da conta.",
            aiTitle: "5. Recursos de IA",
            aiDescription: "Potencialize seu aprendizado com IA. Use a 'Fábrica de Cartões' para gerar cartões automaticamente a partir de texto ou converse com sua base de conhecimento para insights mais profundos.",
        },
        auth: {
            loginTitle: "Entrar",
            welcomeBack: "Bem-vindo de volta",
            signInDescription: "Por favor, insira seus dados para entrar.",
            emailLabel: "Endereço de e-mail",
            passwordLabel: "Senha",
            emailPlaceholder: "nome@exemplo.com",
            passwordPlaceholder: "Digite sua senha",
            signInButton: "Entrar",
            orContinueWith: "OU CONTINUE COM",
            continueWithGoogle: "Continuar com Google",
            dontHaveAccount: "Não tem uma conta?",
            registerNow: "Registre-se agora",

            registerTitle: "Crie sua conta",
            startJourney: "Comece sua jornada de aprendizado hoje.",
            joinThousands: "Junte-se a milhares de estudantes usando flashcards com IA para dominar qualquer assunto, mais rápido.",
            stepLabel: "PASSO {step} DE 3 — {name}",
            authStep: "AUTENTICAÇÃO",
            profileStep: "PERFIL",
            persoStep: "PERSONALIZAÇÃO",

            firstNameLabel: "Nome",
            lastNameLabel: "Sobrenome",
            usernameLabel: "Nome de usuário",
            firstNamePlaceholder: "João",
            lastNamePlaceholder: "Silva",
            usernamePlaceholder: "joaosilva",

            learnGoalLabel: "O que você está estudando?",
            learnGoalPlaceholder: "ex: Medicina, Espanhol, Concursos...",
            newsletter: "Mantenha-me atualizado",
            newsletterDetail: "Pequenas atualizações e dicas para melhorar seu aprendizado.",
            termsAccept: "Eu concordo com os",
            termsOfService: "Termos de Serviço",
            privacyPolicy: "Política de Privacidade",
            and: "e",
            createAccount: "Criar Conta",

            welcomeHeadline: "Bem-vindo ao PowerCards!",
            successSubtext: "Sua conta foi criada com sucesso. Estamos preparando tudo para você.",
            redirecting: "Redirecionando para o login",
            goLogin: "Ir para o Login",

            looksGood: "Parece bom",
            usernameGood: "Nome de usuário disponível",
            usernameHelp: "3-20 caracteres, apenas letras, números e sublinhados",

            weak: "Fraca",
            fair: "Razoável",
            good: "Boa",
            strong: "Forte",
            weakHint: "Muito curta",
            fairHint: "Adicione números ou símbolos",
            goodHint: "Use maiúsculas e minúsculas",
            strongHint: "Excelente! Sua senha é forte",
            alreadyHaveAccount: "Já tem uma conta? Entre",

            emailTaken: "Este e-mail já está cadastrado",
            usernameTaken: "Este nome de usuário já está em uso",
            checking: "Verificando...",

            forgotPassword: "Esqueceu a senha?",
            resetPasswordTitle: "Redefinir sua senha",
            resetPasswordDescription: "Digite seu endereço de e-mail e enviaremos um link para redefinir sua senha.",
            sendResetLink: "Enviar link de redefinição",
            checkYourEmail: "Verifique seu e-mail",
            checkYourEmailDescription: "Enviamos um link de redefinição de senha para o seu e-mail. Verifique sua caixa de entrada.",
            backToLogin: "Voltar para o login",

            mfaTitle: "Autenticação em Dois Fatores",
            mfaDescription: "Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador.",
            mfaEnabled: "Ativada",
            mfaDisabled: "Desativada",
            enableMfa: "Ativar 2FA",
            disableMfa: "Desativar 2FA",
            mfaSetupTitle: "Configurar Autenticação em Dois Fatores",
            mfaSetupDescription: "Escaneie o QR code abaixo com seu aplicativo autenticador (ex: Google Authenticator, Authy).",
            mfaScanQr: "Escaneie este QR code",
            mfaEnterCode: "Digite o código de 6 dígitos do seu aplicativo",
            mfaCodePlaceholder: "000000",
            mfaVerify: "Verificar e Ativar",
            mfaSetupSuccess: "Autenticação em dois fatores ativada com sucesso!",
            mfaSkip: "Pular por enquanto",
            mfaRequired: "Configure a autenticação em dois fatores para proteger sua conta.",
            searchDecks: "Procurar baralhos...",
            ankiBridge: "Anki Bridge",
            yourLibrary: "Sua Coleção",
            importAnki: "Importar do Anki",
            exportAnki: "Exportar para Anki",
            exportAll: "Exportar Todos",
            importDescription: "Arraste seu arquivo .apkg aqui ou clique para procurar.",
            importSuccess: "Importado com sucesso!",
            importStats: "{n} cartões adicionados, {t} etiquetas organizadas",
            whatsNext: "O que deseja fazer agora?",
            studyNow: "Estudar Este Baralho",
            viewDecks: "Ver Todos os Baralhos",
            conflictDetected: "Conflito detectado: {name}",
            mergeDecks: "Mesclar com existente",
            keepSeparate: "Manter separado",
        },
        tags: {
            title: "Etiquetas",
            description: "Gerencie as etiquetas da sua coleção. Clique em uma etiqueta para ver todas as notas com ela.",
            searchPlaceholder: "Pesquisar etiquetas...",
            count: "etiquetas",
            nameHeader: "Nome",
            notesHeader: "Notas",
            actionsHeader: "Ações",
            deleteTitle: "Excluir Etiqueta",
            deleteDescription: "Tem certeza que deseja excluir a etiqueta",
            cancel: "Cancelar",
            deleteAction: "Excluir Etiqueta",
            empty: "Nenhuma etiqueta encontrada.",
        },
        profile: {
            uploadBanner: "Enviar Banner",
            changeBanner: "Alterar Banner",
            uploadAvatar: "Enviar Avatar",
            displayName: "Nome de Exibição",
            email: "E-mail",
            editProfile: "Editar Perfil",
            cancel: "Cancelar",
            save: "Salvar",
            statistics: "Estatísticas",
            decksCreated: "Baralhos Criados",
            notesAdded: "Notas Adicionadas",
            daysStreak: "Dias em Sequência",
            appearance: "Aparência",
            colorPalette: "Paleta de Cores",
            themeDescription: "Selecione um tema de cor para sua interface.",
            aboutMe: "Sobre Mim",
            aboutPlaceholder: "Escreva algo sobre você... (Markdown suportado)",
            markdownSupport: "Suporta Markdown: **negrito**, _itálico_, # cabeçalhos, - listas, etc.",
            noBio: "Nenhuma biografia adicionada ainda.",
            addBio: "Clique para adicionar uma biografia",
            uploading: "Enviando...",
            success: "Sucesso",
            error: "Erro",
            security: "Segurança",
        },
        aiSettings: {
            title: "Configurações de IA",
            provider: "Provedor de IA",
            providerPlaceholder: "Selecione um provedor",
            apiKey: "Chave de API",
            apiKeyPlaceholder: "Cole sua chave de API aqui",
            saveKey: "Salvar Configurações de IA",
            configured: "Configurado",
            notConfigured: "Não configurado",
            saved: "Configurações de IA salvas com sucesso",
            saveFailed: "Falha ao salvar configurações de IA",
            openai: "OpenAI (GPT-4o Mini)",
            gemini: "Google Gemini (2.0 Flash)",
            deepseek: "DeepSeek (Chat)",
            description: "Configure sua própria chave de API para usar recursos de IA como aprimoramento de notas.",
            removeKey: "Remover Chave",
            keyRemoved: "Chave de API removida",
        },
        aiModal: {
            title: "Chave de API Necessária",
            description: "Para usar recursos de IA, você precisa configurar uma chave de API. Acesse as configurações do seu perfil para configurar seu provedor de IA preferido.",
            configureNow: "Configurar Agora",
        },
        upload: {
            title: "Enviar Coleção Anki",
            description: "Importe seus arquivos .apkg existentes para começar a estudar.",
            fileUpload: "Envio de Arquivo",
            dragDrop: "Arraste e solte seu arquivo .apkg aqui ou clique para procurar.",
            successTitle: "Importação Bem-sucedida!",
            imported: "Importados",
            updated: "Atualizados",
            partialTitle: "Duplicatas Encontradas",
            skipped: "Pulados (Duplicatas)",
            done: "Concluído",
            overwrite: "Sobrescrever Tudo",
            errorTitle: "Falha no Envio",
            selectFile: "Pacote Anki (.apkg)",
            uploading: "Enviando...",
            uploadButton: "Enviar",
            errorTooLarge: "Arquivo muito grande. Por favor, envie um arquivo menor.",
            errorGeneric: "Falha no envio. Por favor, tente novamente.",
        },
    },
};
