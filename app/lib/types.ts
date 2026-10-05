import type { Prisma } from "@/prisma/generated/client";
import type {
  EffectiveApplicationStatus,
  WithEffectiveStatus,
} from "@/app/lib/utils/derive-application-status";

export type SearchParamsType = Promise<{ [key: string]: string | undefined }>;
export type IDParamType = Promise<{ id: string }>;

export type OutcomePayload = Prisma.OutcomeGetPayload<{
  include: {
    animal: {
      select: {
        id: true;
        name: true;
      };
    };
    staffMember: {
      select: {
        id: true;
        name: true;
      };
    };
    destinationPartner: {
      select: {
        id: true;
        name: true;
      };
    };
    owner: {
      select: {
        id: true;
        name: true;
      };
    };
    adoptionApplication: {
      select: {
        id: true;
        applicantName: true;
      };
    };
  };
}>;

export type AnimalSectionCardPayload = Omit<
  Prisma.AnimalGetPayload<{
    select: {
      id: true;
      name: true;
      birthDate: true;
      sex: true;
      size: true;
      microchipNumber: true;
      listingStatus: true;
      isSpayedNeutered: true;
      healthStatus: true;
      animalImages: {
        select: {
          url: true;
        };
        
        
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }];
        take: 1;
      };
      species: {
        select: { name: true };
      };
      breeds: {
        select: { name: true };
      };
      primaryColor: {
        select: { name: true };
      };
      colors: {
        select: { name: true };
      };
      currentUnit: {
        select: {
          name: true;
          location: { select: { name: true } };
        };
      };
      
      
      fosterPlacements: {
        where: { endDate: null };
        select: {
          id: true;
          type: true;
          startDate: true;
          expectedEndDate: true;
          fosterProfile: {
            select: { person: { select: { id: true; name: true } } };
          };
        };
        take: 1;
      };
      adoptionApplications: {
        select: { status: true };
      };
      intake: {
        select: { intakeDate: true };
        orderBy: [{ intakeDate: "desc" }, { createdAt: "desc" }];
        take: 1;
      };
      
      
      
      vitalsLogs: {
        where: { deletedAt: null; weightGrams: { not: null } };
        select: { recordedAt: true; weightGrams: true };
        orderBy: { recordedAt: "desc" };
        take: 2;
      };
      _count: {
        select: {
          favorites: true;
          tasks: {
            where: {
              status: { in: ["TODO", "IN_PROGRESS"] };
            };
          };
        };
      };
    };
  }>,
  "adoptionApplications"
> & {
  
  
  adoptionApplications: { id: string; status: EffectiveApplicationStatus }[];
};

export type AnimalIntakeFormPayload = Prisma.AnimalGetPayload<{
  select: {
    id: true;
    name: true;
    birthDate: true;
    sex: true;
    size: true;
    currentWeightGrams: true;
    heightCm: true;
    description: true;
    listingStatus: true;
    microchipNumber: true;
    isSpayedNeutered: true;
    healthStatus: true;
    speciesId: true;
    primaryColorId: true;
    currentUnitId: true;
    breeds: {
      select: {
        id: true;
      };
    };
    colors: {
      select: {
        id: true;
      };
    };
    
    
    vitalsLogs: {
      where: { deletedAt: null; weightGrams: { not: null } };
      select: { recordedAt: true };
      orderBy: { recordedAt: "desc" };
      take: 1;
    };
  };
}>;

export type ActionResult = {
  success: boolean;
  message: string | null;
};




export type AdoptionApplicationPayload = WithEffectiveStatus<
  Prisma.AdoptionApplicationGetPayload<{
    include: {
      animal: {
        select: {
          id: true;
          name: true;
          breeds: {
            select: {
              name: true;
            };
          };
          species: {
            select: {
              name: true;
            };
          };
          adoptionApplications: {
            select: {
              id: true;
            };
          };
        };
      };
    };
  }>
>;






export type StatusHistoryEntry = {
  id: string;
  status: EffectiveApplicationStatus;
  event?: "reversal" | "reopened";
  statusChangeReason: string;
  changedAt: Date;
  changedBy: { name: string | null } | null;
};



export type MyAdoptionApplicationDetailPayload = Omit<
  Prisma.AdoptionApplicationGetPayload<{
    include: {
      animal: {
        select: {
          id: true;
          name: true;
          listingStatus: true;
          breeds: {
            select: {
              name: true;
            };
          };
          species: {
            select: {
              name: true;
            };
          };
          adoptionApplications: {
            select: {
              id: true;
            };
          };
        };
      };
      lastEditedBy: {
        select: { name: true };
      };
      history: {
        orderBy: { changedAt: "desc" };
        include: {
          changedBy: {
            select: { name: true };
          };
        };
      };
    };
  }>,
  "status" | "history"
> & {
  
  
  status: EffectiveApplicationStatus;
  history: StatusHistoryEntry[];
};

export type AnimalForAdoptionApplicationPayload = Prisma.AnimalGetPayload<{
  select: {
    id: true;
    name: true;
    breeds: {
      select: {
        name: true;
      };
    };
    species: {
      select: { name: true };
    };
    adoptionApplications: {
      select: { id: true };
    };
  };
}>;

export type RoleManagementPayload = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    image: true;
    role: true;
    createdAt: true;
    deactivatedAt: true;
    
    person: {
      select: {
        name: true;
      };
    };
  };
}>;

export type AnimalsPayload = Prisma.AnimalGetPayload<{
  select: {
    id: true;
    name: true;
    birthDate: true;
    listingStatus: true;
    sex: true;
    size: true;
  };
}>;

export type MyFosterApplicationPayload = Prisma.FosterApplicationGetPayload<{
  include: {
    speciesCapabilities: {
      select: {
        id: true;
        name: true;
      };
    };
    history: {
      orderBy: { changedAt: "desc" };
      include: {
        changedBy: {
          select: { name: true };
        };
      };
    };
  };
}>;



export type MyAdoptionApplicationPayload = WithEffectiveStatus<
  Prisma.AdoptionApplicationGetPayload<{
    select: {
      id: true;
      status: true;
      applicantName: true;
      applicantPhone: true;
      submittedAt: true;
      animal: {
        select: {
          id: true;
          name: true;
          species: {
            select: {
              name: true;
            };
          };
          animalImages: {
            select: {
              url: true;
            };
            take: 1;
          };
        };
      };
    };
  }>
>;

export type ApplicationsPayload = Prisma.AdoptionApplicationGetPayload<{
  select: {
    id: true;
    applicantName: true;
    applicantEmail: true;
    applicantPhone: true;
    applicantCity: true;
    applicantState: true;
    status: true;
    submittedAt: true;
  };
}>;

export type PartnerPayload = Prisma.PartnerGetPayload<{
  select: {
    id: true;
    name: true;
  };
}>;

export type TaskAssignee = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null | undefined;
};

export type ColorPayload = Prisma.ColorGetPayload<{
  select: {
    id: true;
    name: true;
  };
}>;

export type SpeciesPayload = Prisma.SpeciesGetPayload<{
  select: {
    id: true;
    name: true;
    breeds: {
      select: {
        id: true;
        name: true;
        typicalSize: true;
      };
    };
  };
}>;

export type AnimalReIntakeFormPayload = Prisma.AnimalGetPayload<{
  select: {
    id: true;
    name: true;
    listingStatus: true;
  };
}>;

export type PeopleDirectoryPayload = Prisma.PersonGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
    city: true;
    state: true;
    user: {
      select: {
        id: true;
      };
    };
  };
}>;

export type PersonSectionCardPayload = Prisma.PersonGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
    address: true;
    city: true;
    state: true;
    zipCode: true;
    user: {
      select: {
        id: true;
        role: true;
        image: true;
        emailVerified: true;
        deactivatedAt: true;
      };
    };
    _count: {
      select: {
        adoptionApplications: true;
        surrenderedAnimals: true;
        foundAnimals: true;
        reclaimedAnimalsAsOwner: true;
        tasksAssigned: true;
        tasksCreated: true;
        animalNotesAuthored: true;
        processedIntakes: true;
        processedOutcomes: true;
      };
    };
  };
}>;

export type PersonFormPayload = Prisma.PersonGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
    address: true;
    city: true;
    state: true;
    zipCode: true;
  };
}>;

export type PersonProfileTabPayload = Prisma.PersonGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
    address: true;
    city: true;
    state: true;
    zipCode: true;
    user: {
      select: {
        role: true;
        email: true;
        emailVerified: true;
      };
    };
    householdProfile: {
      select: {
        livingSituation: true;
        hasYard: true;
        landlordPermission: true;
        householdSize: true;
        hasChildren: true;
        childrenAges: true;
        otherAnimalsDescription: true;
        animalExperience: true;
        lastEditedAt: true;
        lastEditedBy: { select: { name: true } };
      };
    };
  };
}>;

export type HouseholdProfilePayload = Prisma.HouseholdProfileGetPayload<{
  select: {
    livingSituation: true;
    hasYard: true;
    landlordPermission: true;
    householdSize: true;
    hasChildren: true;
    childrenAges: true;
    otherAnimalsDescription: true;
    animalExperience: true;
  };
}>;




export type HouseholdProfileWithEditorPayload = Prisma.HouseholdProfileGetPayload<{
  select: {
    livingSituation: true;
    hasYard: true;
    landlordPermission: true;
    householdSize: true;
    hasChildren: true;
    childrenAges: true;
    otherAnimalsDescription: true;
    animalExperience: true;
    lastEditedAt: true;
    lastEditedBy: { select: { name: true } };
  };
}>;

export type PartnersDirectoryPayload = Prisma.PartnerGetPayload<{
  select: {
    id: true;
    name: true;
    type: true;
    email: true;
    phone: true;
    website: true;
    city: true;
    state: true;
    isActive: true;
    _count: {
      select: {
        contacts: true;
      };
    };
  };
}>;

export type PartnerFormPayload = Prisma.PartnerGetPayload<{
  select: {
    id: true;
    name: true;
    type: true;
    email: true;
    phone: true;
    website: true;
    address: true;
    city: true;
    state: true;
    zipCode: true;
    isActive: true;
    notes: true;
  };
}>;

export type PartnerSectionCardPayload = Prisma.PartnerGetPayload<{
  select: {
    id: true;
    name: true;
    type: true;
    email: true;
    phone: true;
    website: true;
    address: true;
    city: true;
    state: true;
    zipCode: true;
    isActive: true;
    notes: true;
    contacts: {
      where: { isPrimary: true; isActive: true };
      take: 1;
      select: {
        role: true;
        person: {
          select: { id: true; name: true; email: true; phone: true };
        };
      };
    };
    _count: {
      select: {
        contacts: true;
        transferredInAnimals: true;
        transferredOutAnimals: true;
        partnerNotes: true;
      };
    };
  };
}>;

export type PartnerContactsPayload = Prisma.PartnerContactGetPayload<{
  select: {
    id: true;
    role: true;
    isPrimary: true;
    isActive: true;
    person: {
      select: {
        id: true;
        name: true;
        email: true;
        phone: true;
      };
    };
  };
}>;

export type LinkablePersonPayload = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isDeactivatedContactHere: boolean;
};

export type PartnerNotePayload = Prisma.PartnerNoteGetPayload<{
  select: {
    id: true;
    content: true;
    author: {
      select: {
        id: true;
        name: true;
      };
    };
    lastEditedBy: {
      select: {
        id: true;
        name: true;
      };
    };
    lastEditedAt: true;
    createdAt: true;
    deletedAt: true;
  };
}>;

export type PersonPickerOption = Prisma.PersonGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
  };
}>;

export type PersonNotePayload = Prisma.PersonNoteGetPayload<{
  select: {
    id: true;
    content: true;
    author: {
      select: {
        id: true;
        name: true;
      };
    };
    lastEditedBy: {
      select: {
        id: true;
        name: true;
      };
    };
    lastEditedAt: true;
    createdAt: true;
    deletedAt: true;
  };
}>;

export type PersonForApplicationFormPayload = Prisma.PersonGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    phone: true;
    address: true;
    city: true;
    state: true;
    zipCode: true;
    householdProfile: {
      select: {
        livingSituation: true;
        hasYard: true;
        landlordPermission: true;
        householdSize: true;
        hasChildren: true;
        childrenAges: true;
        otherAnimalsDescription: true;
        animalExperience: true;
      };
    };
  };
}>;
